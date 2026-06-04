import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import {
  generateAiInsightsText,
  AiInsightsProviderError,
} from "@/lib/ai-insights/generate";
import { deriveInsights, hasSufficientData } from "@/lib/engine/derive-insights";
import {
  AiInsightsPayloadSchema,
  createNullAiInsightsPayload,
  type AiInsightsPayload,
} from "@/lib/ai-insights/types";
import { hashAiInsightMetrics } from "@/lib/ai-insights/cache";
import { deriveNextSteps } from "@/lib/dashboard/next-steps";
import { buildReportDataForUser } from "@/lib/report-data/server";
import type { ReportData } from "@/types/schema";
import type { Insight, InsightSurface, InsightType } from "@/lib/engine/derive-insights";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  period: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
    label: z.string().min(1),
  }),
});

function insightsForSurface(insights: Insight[], surface: InsightSurface) {
  return insights.filter((i) => i.surface.includes(surface));
}

// ─── Reasoning rules ──────────────────────────────────────────────────────────
// Maps each classified insight type to the advisor reasoning the model should
// apply when writing copy for that pattern. Only rules matching the actual
// classified insights are injected — keeps the prompt tight and the output
// responsive to this client's specific situation.

const INSIGHT_REASONING: Partial<Record<InsightType, string>> = {
  traffic_up_broadly:
    "Trafiken har ökat. Förklara varifrån ökningen kommer och om den verkar skapa affärsnytta. Om köp eller förfrågningar inte ökar i samma takt, lyft det som en viktig signal.",

  traffic_down_broadly:
    "Trafiken har minskat. Förklara vilken kanal som tappat mest och om det påverkar resultatet. Nämn möjliga orsaker: kampanjpaus, säsong, teknisk förändring eller mätproblem — men säg aldrig att du vet säkert.",

  traffic_drop_organic:
    "Den organiska trafiken från Google har tappat markant. Det kan bero på rankingförändringar, ny konkurrens, borttaget innehåll eller tekniska problem. Rekommendera att kontrollera Google Search Console och se vilka sidor som tappat.",

  traffic_drop_paid:
    "Betald trafik har minskat. Kontrollera om kampanjer har pausats, budgeten tagit slut eller om CTR har sjunkit. En minskning i betald trafik märks ofta snabbt i konverteringar.",

  traffic_channel_concentrated:
    "En enda kanal dominerar trafiken kraftigt. Om den kanalen är direkttrafik eller okänd källa, behandla det som ett attributionsproblem snarare än en styrka — kontrollera UTM-taggar och GA4-konfiguration innan slutsatser dras. Om det är en riktig kanal (Google, Meta, e-post) förklara att koncentrationen skapar sårbarhet och att det är värt att fundera på fler kanaler.",

  engagement_down:
    "Avvisningsfrekvensen har ökat, vilket tyder på att fler besökare lämnar utan att engagera sig. Möjliga orsaker: fel målgrupp, innehåll som inte möter förväntningarna, eller tekniska problem. Rekommendera att se över landningssidor och laddningstider.",

  engagement_up:
    "Avvisningsfrekvensen har sjunkit — fler besökare stannar och engagerar sig. Det är ett positivt tecken på att innehållet eller sidupplevelsen har förbättrats.",

  contact_page_lost_visibility:
    "Kontaktsidan har tappat trafik. Det är en viktig signal eftersom det direkt kan påverka antalet förfrågningar. Rekommendera att kontrollera om sidan är tillgänglig, om interna länkar finns och om det finns ett tydligt erbjudande.",

  paid_roas_strong:
    "Annonserna ger god avkastning. Lyft att det finns potential att skala upp de kampanjer som presterar bäst, men att det bör göras gradvis för att hålla lönsamheten.",

  paid_cost_up_conversions_flat:
    "Annonskostnaden har ökat men konverteringarna hänger inte med. Det innebär att kostnad per resultat har försämrats. Rekommendera att flytta budget mot kampanjer som faktiskt skapar köp eller förfrågningar, inte bara klick.",

  seo_positions_improving:
    "Genomsnittspositionen i Google har förbättrats. Det är en positiv signal som kan ge mer trafik framöver. Rekommendera att fortsätta publicera relevant innehåll och stärka de sidor som klättrat.",

  seo_positions_declining:
    "Rankningen i Google har försämrats. Det kan bero på ny konkurrens, algoritmuppdateringar eller att sidor inte uppdaterats. Rekommendera att se över de sidor som tappat och om innehållet fortfarande svarar på besökarens frågor.",

  conversion_rate_improved:
    "Konverteringsgraden — alltså andelen besökare som köpte eller tog kontakt — har förbättrats. Det tyder på att webbplatsen eller erbjudandet resonerar bättre med besökarna.",

  conversion_rate_declined:
    "Konverteringsgraden har sjunkit. Fler besöker men färre agerar. Möjliga orsaker: fel trafikkälla, förändrat erbjudande, tekniskt problem i formulär eller kassa. Rekommendera att kontrollera hela vägen från klick till bekräftelse.",

  data_missing_tracking_issue:
    "Datan är begränsad eller saknas för perioden. Undvik att dra stora slutsatser. Rekommendera att kontrollera att mätningen fungerar korrekt.",
};

function buildReasoningRules(insights: Insight[]): string {
  const seen = new Set<string>();
  const rules: string[] = [];

  for (const insight of insights) {
    if (!seen.has(insight.type) && INSIGHT_REASONING[insight.type]) {
      seen.add(insight.type);
      rules.push(`• ${INSIGHT_REASONING[insight.type]}`);
    }
  }

  if (rules.length === 0) return "";

  return `\nTolkningsregler baserade på klassificerade mönster i datan:
${rules.join("\n")}`;
}

const ATTRIBUTION_UNCLEAR_CHANNELS = [
  "direkt",
  "direkttrafik",
  "direct",
  "(direct)",
  "ej tilldelad",
  "ej identifierad trafik",
  "okänd",
  "okänd trafik",
  "(not set)",
  "unassigned",
];

function isAttributionUnclearChannel(channel: string): boolean {
  const normalized = channel.toLowerCase();
  return ATTRIBUTION_UNCLEAR_CHANNELS.some((candidate) =>
    normalized.includes(candidate),
  );
}

function buildPrompt(
  insights: Insight[],
  data: ReportData,
  sufficient: Record<InsightSurface, boolean>,
  period: string,
): string {
  const t = data.trafficOverview;
  const seo = data.seoOverview;
  const conv = data.conversions;
  const paid = data.paidOverview;

  const visits = t?.totalSessions?.value ?? 0;
  const visitsPrev = t?.totalSessions?.previousValue ?? 0;
  const visitsDelta =
    visitsPrev > 0 ? Math.round(((visits - visitsPrev) / visitsPrev) * 100) : null;

  // Find the dominant channel — normalize share regardless of mapper output (0–1 or 0–100).
  const channels = t?.channelBreakdown ?? [];
  const dominant = channels.length > 0
    ? channels.reduce((best, ch) => {
        const s = ch.share <= 1 ? ch.share * 100 : ch.share;
        const bestS = best.share <= 1 ? best.share * 100 : best.share;
        return s > bestS ? ch : best;
      })
    : null;
  const topChannelLabel = dominant?.channel ?? "okänd kanal";
  const topChannelPct = dominant != null
    ? Math.round(dominant.share <= 1 ? dominant.share * 100 : dominant.share)
    : null;
  const attributionUnclear = isAttributionUnclearChannel(topChannelLabel);
  const attributionNote = attributionUnclear
    ? "Osäker attribution: direkt/okänd trafik kan bero på kampanjlänkar utan UTM-taggar, mätproblem, bokmärken, appar, varumärkestrafik eller skyddade webbläsare. Presentera den inte som en bekräftad marknadskanal."
    : null;
  const bounceRate = t?.bounceRate?.value ?? null;
  const bouncePrev = t?.bounceRate?.previousValue ?? null;

  // SEO snapshot
  const clicks = seo?.totalClicks?.value ?? null;
  const clicksPrev = seo?.totalClicks?.previousValue ?? null;
  const avgPos = seo?.avgPosition?.value ?? null;
  const avgPosPrev = seo?.avgPosition?.previousValue ?? null;

  // Conversions snapshot
  const convRate = conv?.conversionRate?.value ?? null;
  const convRatePrev = conv?.conversionRate?.previousValue ?? null;
  const convTotal = conv?.totalConversions?.value ?? null;

  // Paid snapshot
  const spend = paid?.totalSpend?.value ?? null;
  const roas = paid?.roas?.value ?? null;

  // Reasoning rules — only for patterns present in this client's data
  const reasoningRules = buildReasoningRules(insights);
  const nextSteps = deriveNextSteps(data);

  // Helper to format deltas readably
  const fmtDelta = (v: number | null) =>
    v !== null ? `${v > 0 ? "+" : ""}${v}%` : "ingen jämförelseperiod";
  const fmtNum = (v: number | null) =>
    v !== null ? v.toLocaleString("sv-SE") : "ej tillgänglig";

  return `Period: ${period}

TRAFIKDATA:
- Besök denna period: ${fmtNum(visits)}
- Besök föregående period: ${fmtNum(visitsPrev > 0 ? visitsPrev : null)}
- Förändring: ${fmtDelta(visitsDelta)}
- Starkaste kanal enligt mätningen: ${topChannelLabel}${topChannelPct != null ? ` (${topChannelPct}% av trafiken)` : ""}
- Attributionssäkerhet: ${attributionNote ?? "Kanalen kan behandlas som en faktisk trafikkälla i analysen."}
- Avvisningsfrekvens: ${bounceRate != null ? `${bounceRate.toFixed(1)}%` : "ej mätt"}${bouncePrev != null ? ` (föregående: ${bouncePrev.toFixed(1)}%)` : ""}
${clicks != null ? `\nSÖKSYNLIGHET (Google):
- Klick från Google: ${fmtNum(clicks)}${clicksPrev != null ? ` (föregående: ${fmtNum(clicksPrev)})` : ""}
- Genomsnittsposition: ${avgPos?.toFixed(1) ?? "ej tillgänglig"}${avgPosPrev != null ? ` (föregående: ${avgPosPrev.toFixed(1)})` : ""}` : ""}
${convRate != null ? `\nKONVERTERINGAR:
- Konverteringsgrad: ${convRate.toFixed(2)}%${convRatePrev != null ? ` (föregående: ${convRatePrev.toFixed(2)}%)` : ""}
- Antal konverteringar: ${fmtNum(convTotal)}` : ""}
${spend != null ? `\nBETALDA ANNONSER:
- Annonskostnad: ${fmtNum(spend)} kr
- ROAS (avkastning per krona): ${roas?.toFixed(2) ?? "ej tillgänglig"}` : ""}

KLASSIFICERADE INSIKTER (sorterade efter allvar):
${insights.map((i) => `- [${i.severity.toUpperCase()}] ${i.type}: ${JSON.stringify(i.metrics)}`).join("\n")}
${reasoningRules}

Generera copy för följande ytor. Varje yta har en ROLL, DATA och ett CONSTRAINT.
Om en yta är markerad INSUFFICIENT DATA, returnera null för den nyckeln.

=== dashboard_hero ===
ROLL: Du är en kunnig rådgivare som ger ägaren en omedelbar känsla för läget. Rubriken ska fånga den viktigaste förändringen — inte vara generisk. Undertexten förklarar vad mätningen visar som starkaste kanal, hur det har gått jämfört med förra perioden, och lyfter en konkret signal (positiv eller negativ). Om attributionen är osäker ska du säga det tydligt och lugnt. Nämn faktiska siffror. Skriv som om du pratar direkt med ägaren.
DATA: visits=${fmtNum(visits)}, visitsDelta=${fmtDelta(visitsDelta)}, topChannel=${topChannelLabel}${topChannelPct != null ? ` (${topChannelPct}%)` : ""}, attributionUnclear=${attributionUnclear}, attributionNote=${attributionNote ?? "ingen"}, bounceRate=${bounceRate != null ? `${bounceRate.toFixed(1)}%` : "ej mätt"}
CONSTRAINT: Returnera { "headline": "max 8 ord", "sub": "2 meningar. Mening 1: hur många besök, vad mätningen visar som starkaste kanal, och hur det jämförs med förra perioden. Mening 2: den viktigaste signalen ägaren bör känna till just nu." }
EXEMPEL:
  FEL headline: "Ökning i besök denna period" — för generisk, nämner ingenting specifikt
  FEL headline: "Trafiken har ökat" — beskriver inte vad som faktiskt hänt eller var
  RÄTT headline: "Google driver mer trafik i maj" — konkret kanal, konkret period
  RÄTT headline: "Mätningen visar osäker direkttrafik" — korrekt när Direct/okänd dominerar
  FEL sub: "Det har varit 114 besök, alla från direkttrafik." — konstaterar bara siffran, ingen signal
  RÄTT sub: "Den här månaden kom 1 240 besök, varav 68 % via Google — en ökning med 18 % mot förra månaden. Engagemanget är starkt, men kontaktsidan tappade trafik vilket är värt att följa upp."
STATUS: ${sufficient.dashboard_hero ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_hero ===
ROLL: Rådgivare i fickan. Ägaren har precis sett rubriken och besöksantalet — nu vill de förstå vad som faktiskt händer. Skriv ett kort stycke som förklarar: vad mätningen visar, varför det kan vara så (möjliga orsaker, aldrig säker), och vad ägaren bör hålla koll på härnäst. Gör dem nyfikna på att läsa vidare — men ge dem redan ett svar.
DATA: visits=${fmtNum(visits)}, visitsDelta=${fmtDelta(visitsDelta)}, topChannel=${topChannelLabel}${topChannelPct != null ? ` (${topChannelPct}%)` : ""}, attributionUnclear=${attributionUnclear}, attributionNote=${attributionNote ?? "ingen"}, bounceRate=${bounceRate != null ? `${bounceRate.toFixed(1)}%` : "ej mätt"}
CONSTRAINT: MÅSTE returnera en sträng — aldrig null. 2–4 meningar. Börja inte med "Besöken" eller "Trafiken". Inga rubriker, inga listor — flytande text som en kunnig kollega skulle säga det.
EXEMPEL:
  FEL: "Direkttrafiken stod för 69 % av besöken och avvisningsfrekvensen var 48,2 %." — räknar upp siffror utan att förklara något
  FEL: "Trafiken ökade denna period med stöd från direkttrafik." — börjar fel, ingen förklaring, ingen signal
  RÄTT: "Merparten av besöken kom direkt — utan att passera Google eller sociala medier. Det kan tyda på att varumärket är välkänt bland besökarna, men det kan också betyda att spårningen inte fångar alla kanaler korrekt. Värt att kontrollera om GA4-taggningen sitter rätt innan du drar slutsatser om kanalbilden."
  RÄTT: "Google driver nästan all trafik just nu, vilket är ett styrketecken för er synlighet i sökresultaten. Avvisningsfrekvensen på 48 % är helt normal — men om den börjar stiga är det ett tecken på att besökarna inte hittar det de letar efter direkt."
STATUS: GENERATE

=== slide_insight ===
ROLL: Strategisk analytiker. Din uppgift är att förklara vad som faktiskt händer i affären — inte bara lista siffror. Svara på tre frågor: Vad har hänt? Varför kan det vara så? Vad bör ägaren göra? Skriv som en kunnig rådgivare som pratar direkt med ägaren, inte som ett rapportsystem.
DATA: ${JSON.stringify(insightsForSurface(insights, "slide_insight").map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera { "body": ["stycke 1", "stycke 2", "stycke 3"], "bottom_line": "1 skarp mening som sammanfattar affärsläget" }. Varje stycke: 2–3 meningar. bottom_line ska kännas som rådet från en erfaren analytiker — inte en rubrik.
STATUS: ${sufficient.slide_insight ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_recs ===
ROLL: Konkreta råd kopplade direkt till klassificerade signaler i datan. Varje råd måste referera till en faktisk siffra eller ett faktiskt mönster. Inga generiska råd.
DATA: ${JSON.stringify(insightsForSurface(insights, "slide_recs").map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera en array med max 3 objekt: { "body": "1–2 meningar. Börja med ett konkret verb. Nämn varför — koppla till datan." }
EXEMPEL:
  FEL: "Optimera kampanjerna för bättre resultat." — inget verb, ingen siffra, inget varför
  FEL: "Förbättra konverteringsresan på webbplatsen." — generiskt, kunde gälla vem som helst
  RÄTT: "Lägg mer budget på de annonser som gav flest förfrågningar förra månaden — annonskostnaden ökade med 22 % men konverteringarna stod still, vilket tyder på att fel kampanjer fick mest pengar."
  RÄTT: "Kontrollera kontaktsidans synlighet i Google — sidan tappade trafik den här perioden och det kan direkt påverka antalet förfrågningar ni får in."
STATUS: ${sufficient.slide_recs ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_recap ===
ROLL: Redaktör. Tre saker ägaren minns efter att ha stängt rapporten. Varje rad ska vara en skarp, fristående insikt — inte en upprepning av rubrikerna ovan.
DATA: ${JSON.stringify(insightsForSurface(insights, "slide_recap").slice(0, 3).map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera en array med exakt 3 objekt: { "body": "1 mening, max 15 ord. Konkret, med siffra om möjligt." }
EXEMPEL:
  FEL: "Trafiken ökade under perioden." — för vag, ingen siffra, inget att minnas
  FEL: "Det är viktigt att följa upp konverteringarna." — råd, inte insikt
  RÄTT: "Google stod för 71 % av trafiken — en kanal dominerar helt."
  RÄTT: "Avvisningsfrekvensen sjönk 6 punkter — fler stannar och engagerar sig."
  RÄTT: "Kontaktsidan tappade synlighet, vilket kan kosta förfrågningar framöver."
STATUS: ${sufficient.slide_recap ? "GENERATE" : "INSUFFICIENT DATA"}

=== next_steps ===
ROLL: Coach. Förklara varför varje nästa steg är relevant för just den här klienten just nu. Koppla alltid till en konkret datapunkt.
DATA: ${JSON.stringify({
    actions: nextSteps.map((step, index) => ({
      index,
      action: step.action,
      deterministicRationale: step.rationale,
      effort: step.effort,
      reward: step.reward,
    })),
    triggeringInsights: insightsForSurface(insights, "next_steps").map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })),
  })}
CONSTRAINT: Returnera en array med exakt samma ordning som DATA.actions, max 3 objekt: { "rationale": "1 mening. Förklara varför just denna action är relevant. Namnge siffran eller mönstret som motiverar steget." }
STATUS: ${sufficient.next_steps ? "GENERATE" : "INSUFFICIENT DATA"}

Returnera exakt ett JSON-objekt med dessa nycklar:
{
  "dashboard_hero": null,
  "slide_hero": null,
  "slide_insight": null,
  "slide_recs": null,
  "slide_recap": null,
  "next_steps": null
}

Byt ut null mot genererat värde för varje yta med STATUS: GENERATE.`;
}

function extractJsonObject(raw: string): unknown {
  // Models occasionally wrap Swedish/English words in Unicode smart quotes
  // (“ “ ‘ ‘) inside JSON string values. These are valid Unicode but invalid
  // inside JSON strings and cause JSON.parse to throw. Replace smart double
  // quotes with single quotes (preserves readability, keeps JSON valid) and
  // smart single quotes with plain apostrophes.
  const normalized = raw
    // U+201C/U+201D left/right double quotation marks → plain single quote
    .replace(/[“”]/g, "'")
    // U+2018/U+2019 left/right single quotation marks → plain apostrophe
    .replace(/[‘’]/g, "'");

  const trimmed = normalized.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

function applySufficiencyGate(
  payload: AiInsightsPayload,
  sufficient: Record<InsightSurface, boolean>,
): AiInsightsPayload {
  return {
    dashboard_hero: sufficient.dashboard_hero ? payload.dashboard_hero : null,
    next_steps: sufficient.next_steps ? payload.next_steps : null,
    slide_hero: sufficient.slide_hero ? payload.slide_hero : null,
    slide_insight: sufficient.slide_insight ? payload.slide_insight : null,
    slide_recs: sufficient.slide_recs ? payload.slide_recs : null,
    slide_recap: sufficient.slide_recap ? payload.slide_recap : null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { period } = parsed.data;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await buildReportDataForUser({
      supabase,
      userId: user.id,
      dateRange: { startDate: period.start, endDate: period.end },
      periodLabel: period.label,
      locale: "sv",
      caller: "generate-insights",
    });

    if (report.status !== "ok") {
      console.warn("[generate-insights] buildReportData did not return ok", {
        user: user.id.slice(0, 8),
        period: `${period.start}..${period.end}`,
        status: report.status,
      });
      return NextResponse.json({
        insights: createNullAiInsightsPayload(),
        reason: report.status,
      });
    }

    const reportData = report.data;
    const metricsHash = hashAiInsightMetrics(reportData);
    const logContext = {
      user: user.id.slice(0, 8),
      period: `${period.start}..${period.end}`,
      label: period.label,
      hash: metricsHash.slice(0, 12),
    };

    // ── Atomic generation lease via RPC ─────────────────────────────────────
    // claim_ai_insights_generation serialises concurrent requests at the DB level.
    // It returns one of three states:
    //   { claimed: true,  cached: false } → we own generation
    //   { claimed: false, cached: true  } → fresh done row exists, read it
    //   { claimed: false, cached: false } → another request is generating; tell client to poll
    const { data: claim, error: claimError } = await supabase.rpc(
      "claim_ai_insights_generation",
      {
        p_user_id:       user.id,
        p_period_start:  period.start,
        p_period_end:    period.end,
        p_metrics_hash:  metricsHash,
        p_lease_seconds: 60,
      },
    );

    console.log("[generate-insights] cache claim", {
      ...logContext,
      claim,
      claimError: claimError?.message ?? null,
    });

    if (claimError) {
      // RPC failure is non-fatal — fall through to generate without a lock.
      // Worst case: two requests generate in parallel and the last write wins.
      console.error("[generate-insights] claim RPC failed:", claimError.message);
    } else if (claim?.cached === true) {
      // Fresh done row — read insights directly.
      const { data: cached } = await supabase
        .from("ai_report_cache")
        .select("insights")
        .eq("user_id", user.id)
        .eq("period_start", period.start)
        .eq("period_end", period.end)
        .maybeSingle();

      const result = AiInsightsPayloadSchema.safeParse(cached?.insights);
      const hasAnyContent =
        result.success && Object.values(result.data).some((v) => v !== null);
      if (hasAnyContent) {
        console.log("[generate-insights] cache hit", logContext);
        return NextResponse.json({ insights: result.data, cached: true });
      }
      console.log("[generate-insights] cache row ignored: empty payload", logContext);
      // Cache row exists but content is all-null — fall through and generate.
    } else if (claim?.claimed === false && claim?.cached === false) {
      // Another request holds the lease. Tell the client to poll.
      console.log("[generate-insights] generation pending", logContext);
      return NextResponse.json({ generating: true }, { status: 202 });
    }
    // claim?.claimed === true → we own the lease, proceed with generation.

    const insights = deriveInsights(reportData);
    const sufficient: Record<InsightSurface, boolean> = {
      dashboard_hero: hasSufficientData("dashboard_hero", insights, reportData),
      slide_hero: true, // always generate — component shows shimmer until resolved
      slide_insight: hasSufficientData("slide_insight", insights, reportData),
      slide_recs: hasSufficientData("slide_recs", insights, reportData),
      slide_recap: hasSufficientData("slide_recap", insights, reportData),
      next_steps: hasSufficientData("next_steps", insights, reportData),
    };

    console.log("[generate-insights] sufficiency + insights", {
      ...logContext,
      sufficient,
      insightCount: insights.length,
      insightTypes: insights.map((i) => `${i.type}:${i.severity}`),
      totalSessions: reportData.trafficOverview?.totalSessions?.value ?? null,
      availableSources: reportData.meta.availableSources,
    });

    if (!Object.values(sufficient).some(Boolean)) {
      const payload = createNullAiInsightsPayload();
      await supabase.from("ai_report_cache").upsert(
        {
          user_id: user.id,
          period_start: period.start,
          period_end: period.end,
          metrics_hash: metricsHash,
          generation_status: "done",
          generation_expires_at: null,
          generated_at: new Date().toISOString(),
          insights: payload,
        },
        { onConflict: "user_id,period_start,period_end" },
      );
      console.log("[generate-insights] cached null payload: insufficient data", logContext);
      return NextResponse.json({ insights: payload, cached: false });
    }

    // Helper: mark our lease as failed so the next request can reclaim it
    // immediately rather than waiting for the 60-second TTL to expire.
    const releaseLeaseFailed = () =>
      supabase.from("ai_report_cache").update({
        generation_status: "failed",
        generation_expires_at: null,
      })
      .eq("user_id", user.id)
      .eq("period_start", period.start)
      .eq("period_end", period.end);

    const prompt = buildPrompt(insights, reportData, sufficient, period.label);
    let raw: string;
    try {
      console.log("[generate-insights] provider call start", {
        ...logContext,
        insightCount: insights.length,
        sufficient,
      });
      raw = await generateAiInsightsText(prompt);
      console.log("[generate-insights] provider call done", {
        ...logContext,
        chars: raw.length,
      });
    } catch (err) {
      if (err instanceof AiInsightsProviderError) {
        console.error("[generate-insights] provider config error:", err.message);
      } else {
        console.error("[generate-insights] provider call failed:", err);
      }
      // Release the lease so the next request can retry. A config error or
      // transient outage should not block future requests for 60 seconds.
      await releaseLeaseFailed();
      console.log("[generate-insights] lease marked failed after provider error", logContext);
      return NextResponse.json({ insights: createNullAiInsightsPayload(), cached: false });
    }

    let payload: AiInsightsPayload | null;
    try {
      const json = extractJsonObject(raw);
      const result = AiInsightsPayloadSchema.safeParse(json);
      payload = result.success ? applySufficiencyGate(result.data, sufficient) : null;
    } catch (e) {
      console.error("[generate-insights] extractJsonObject threw:", e);
      payload = null;
    }

    if (!payload) {
      // Model returned malformed/unparseable JSON. Release lease so next
      // request can retry after prompt/model tweaks.
      console.error("[generate-insights] failed to parse model output:", raw.slice(0, 500));
      await releaseLeaseFailed();
      console.log("[generate-insights] lease marked failed after parse error", logContext);
      return NextResponse.json({ insights: createNullAiInsightsPayload(), cached: false });
    }

    await supabase.from("ai_report_cache").upsert(
      {
        user_id: user.id,
        period_start: period.start,
        period_end: period.end,
        metrics_hash: metricsHash,
        generation_status: "done",
        generation_expires_at: null,
        generated_at: new Date().toISOString(),
        insights: payload,
      },
      { onConflict: "user_id,period_start,period_end" },
    );

    console.log("[generate-insights] cache write done", {
      ...logContext,
      slots: Object.entries(payload)
        .filter(([, value]) => value !== null)
        .map(([slot]) => slot),
    });

    return NextResponse.json({ insights: payload, cached: false });
  } catch (err) {
    console.error("[generate-insights]", err);
    return NextResponse.json({ insights: createNullAiInsightsPayload(), fallback: true });
  }
}
