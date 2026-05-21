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
import {
  hashAiInsightMetrics,
  isFreshAiInsightsCache,
} from "@/lib/ai-insights/cache";
import { buildReportDataForUser } from "@/lib/report-data/server";
import type { ReportData } from "@/types/schema";
import type { Insight, InsightSurface } from "@/lib/engine/derive-insights";

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

function buildPrompt(
  insights: Insight[],
  data: ReportData,
  sufficient: Record<InsightSurface, boolean>,
  period: string,
): string {
  const t = data.trafficOverview;
  const visits = t?.totalSessions?.value ?? 0;
  const visitsPrev = t?.totalSessions?.previousValue ?? 0;
  const visitsDelta =
    visitsPrev > 0 ? Math.round(((visits - visitsPrev) / visitsPrev) * 100) : null;
  // Find the dominant channel explicitly (same logic as the classifier).
  // share may be 67.5 or 0.675 depending on mapper version — normalize it.
  const channels = t?.channelBreakdown ?? [];
  const dominant = channels.length > 0
    ? channels.reduce((best, ch) => {
        const s = ch.share <= 1 ? ch.share * 100 : ch.share;
        const bestS = best.share <= 1 ? best.share * 100 : best.share;
        return s > bestS ? ch : best;
      })
    : null;
  const topChannel = dominant?.channel ?? "okänd kanal";
  const topChannelPct = dominant != null
    ? Math.round(dominant.share <= 1 ? dominant.share * 100 : dominant.share)
    : null;
  const bounceRate = t?.bounceRate?.value ?? null;

  return `Du är Clarix, en pedagogisk och lugn digital rådgivare som skriver på svenska för SME-ägare utan teknisk bakgrund.

Regler som alltid gäller:
- Skriv på svenska.
- Använd bara fakta från datan nedan. Spekulera aldrig.
- Ton: lugn, kunnig, aldrig hype eller vag.
- Om en yta är markerad som INSUFFICIENT DATA, returnera null för den nyckeln.
- Returnera ett giltigt JSON-objekt. Inga markdown-block, inga kommentarer, ingen text före eller efter JSON.

Period: ${period}
Besök denna period: ${visits.toLocaleString("sv-SE")}
Besök föregående period: ${visitsPrev.toLocaleString("sv-SE")}
Förändring: ${
    visitsDelta !== null
      ? `${visitsDelta > 0 ? "+" : ""}${visitsDelta}%`
      : "ingen jämförelseperiod"
  }
Starkaste kanal: ${topChannel}${topChannelPct != null ? ` (${topChannelPct}% av trafiken)` : ""}
Avvisningsfrekvens: ${bounceRate != null ? `${bounceRate.toFixed(1)}%` : "ej mätt"}

Klassificerade insikter, sorterade efter allvar:
${insights.map((i) => `- [${i.severity.toUpperCase()}] ${i.type}: ${JSON.stringify(i.metrics)}`).join("\n")}

Generera copy för följande ytor. Varje yta har en ROLL, DATA och ett CONSTRAINT.

=== dashboard_hero ===
ROLL: Berättare. Förklara vad som hände den här perioden i ett enkelt, tillgängligt språk.
DATA: visits=${visits}, visitsDelta=${visitsDelta}, topChannel=${topChannel}
CONSTRAINT: Returnera null eller { "headline": "max 8 ord", "sub": "1 mening, max 20 ord" }.
STATUS: ${sufficient.dashboard_hero ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_hero ===
ROLL: Sammanfattare. Förklara vad som hände i ett pedagogiskt stycke för en icke-teknisk läsare.
DATA: visits=${visits}, visitsDelta=${visitsDelta !== null ? `${visitsDelta}%` : "okänd"}, topChannel=${topChannel}, topChannelPct=${topChannelPct !== null ? `${topChannelPct}%` : "okänd"}
CONSTRAINT: Returnera null eller en sträng med exakt 2 meningar.
STATUS: ${sufficient.slide_hero ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_insight ===
ROLL: Strateg. Analysera vad siffrorna betyder för affären, inte bara dashboarden.
DATA: ${JSON.stringify(insightsForSurface(insights, "slide_insight").map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera null eller { "body": ["stycke 1", "stycke 2", "stycke 3"], "bottom_line": "1 skarp mening" }. Varje stycke: 2-3 meningar.
STATUS: ${sufficient.slide_insight ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_recs ===
ROLL: Rådgivare. Ge konkreta nästa steg baserade enbart på de klassificerade insikterna.
DATA: ${JSON.stringify(insightsForSurface(insights, "slide_recs").map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera null eller en array med max 3 objekt. Varje objekt: { "body": "1-2 meningar, konkret, börja med ett verb" }.
STATUS: ${sufficient.slide_recs ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_recap ===
ROLL: Redaktör. Destillera de viktigaste takeaways till tre skarpa rader.
DATA: ${JSON.stringify(insightsForSurface(insights, "slide_recap").slice(0, 3).map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera null eller en array med exakt 3 objekt. Varje objekt: { "body": "1 mening, max 15 ord" }.
STATUS: ${sufficient.slide_recap ? "GENERATE" : "INSUFFICIENT DATA"}

=== next_steps ===
ROLL: Coach. Förklara varför varje steg är relevant för just den här klienten baserat på datan.
DATA: ${JSON.stringify(insightsForSurface(insights, "next_steps").map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera null eller en array med max 3 objekt. Varje objekt: { "rationale": "1 mening med en specifik datapunkt" }.
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

Byt endast ut null mot värden för ytor med STATUS: GENERATE.`;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
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
    });

    if (report.status !== "ok") {
      return NextResponse.json({
        insights: createNullAiInsightsPayload(),
        reason: report.status,
      });
    }

    const reportData = report.data;
    const metricsHash = hashAiInsightMetrics(reportData);
    const { data: cached } = await supabase
      .from("ai_report_cache")
      .select("insights, metrics_hash, generated_at")
      .eq("user_id", user.id)
      .eq("period_start", period.start)
      .eq("period_end", period.end)
      .maybeSingle();

    if (isFreshAiInsightsCache(cached, metricsHash)) {
      const result = AiInsightsPayloadSchema.safeParse(cached?.insights);
      if (result.success) {
        return NextResponse.json({ insights: result.data, cached: true });
      }
    }

    const insights = deriveInsights(reportData);
    const sufficient: Record<InsightSurface, boolean> = {
      dashboard_hero: hasSufficientData("dashboard_hero", insights, reportData),
      slide_hero: hasSufficientData("slide_hero", insights, reportData),
      slide_insight: hasSufficientData("slide_insight", insights, reportData),
      slide_recs: hasSufficientData("slide_recs", insights, reportData),
      slide_recap: hasSufficientData("slide_recap", insights, reportData),
      next_steps: hasSufficientData("next_steps", insights, reportData),
    };

    if (!Object.values(sufficient).some(Boolean)) {
      const payload = createNullAiInsightsPayload();
      await supabase.from("ai_report_cache").upsert(
        {
          user_id: user.id,
          period_start: period.start,
          period_end: period.end,
          metrics_hash: metricsHash,
          generated_at: new Date().toISOString(),
          insights: payload,
        },
        { onConflict: "user_id,period_start,period_end" },
      );
      return NextResponse.json({ insights: payload, cached: false });
    }

    const prompt = buildPrompt(insights, reportData, sufficient, period.label);
    let raw: string;
    try {
      raw = await generateAiInsightsText(prompt);
    } catch (err) {
      if (err instanceof AiInsightsProviderError) {
        console.error("[generate-insights] provider config error:", err.message);
      } else {
        console.error("[generate-insights] provider call failed:", err);
      }
      // Do not cache — a config error or transient outage should not poison the
      // cache. The next request will retry the LLM call.
      return NextResponse.json({ insights: createNullAiInsightsPayload(), cached: false });
    }

    let payload: AiInsightsPayload | null;
    try {
      const json = extractJsonObject(raw);
      const result = AiInsightsPayloadSchema.safeParse(json);
      payload = result.success ? applySufficiencyGate(result.data, sufficient) : null;
    } catch {
      payload = null;
    }

    if (!payload) {
      // Model returned malformed/unparseable JSON. Log for prompt debugging but
      // do not cache — so a refresh can retry after prompt/model tweaks.
      console.error("[generate-insights] failed to parse model output:", raw.slice(0, 500));
      return NextResponse.json({ insights: createNullAiInsightsPayload(), cached: false });
    }

    await supabase.from("ai_report_cache").upsert(
      {
        user_id: user.id,
        period_start: period.start,
        period_end: period.end,
        metrics_hash: metricsHash,
        generated_at: new Date().toISOString(),
        insights: payload,
      },
      { onConflict: "user_id,period_start,period_end" },
    );

    return NextResponse.json({ insights: payload, cached: false });
  } catch (err) {
    console.error("[generate-insights]", err);
    return NextResponse.json({ insights: createNullAiInsightsPayload(), fallback: true });
  }
}
