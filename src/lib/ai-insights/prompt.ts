// The advisor prompt for /api/generate-insights: reasoning rules per
// classified insight, attribution caveats, and one section per copy slot.
// Pure string building — no I/O — so it can be read and tuned on its own.
import { buildEvidenceRegistry } from "@/lib/ai-insights/evidence";
import type { Insight, InsightSurface, InsightType } from "@/lib/engine/derive-insights";
import type { ReportData } from "@/types/schema";

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

export function buildPrompt(
  insights: Insight[],
  data: ReportData,
  sufficient: Record<InsightSurface, boolean>,
  period: string,
  stepsSufficient: boolean,
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
  const evidenceRegistry = buildEvidenceRegistry(data);

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

SIFFERFORMAT (gäller all text du skriver):
- När du nämner en förändring mot förra perioden, skriv siffran med tecken: "+3,5 %" för uppgång, "−9 %" för nedgång (använd minustecknet −, inte bindestreck). Tecknet ersätter inte ordet — skriv gärna "en nedgång på −9 %", men siffran SKA bära tecknet.
- Absoluta tal som inte är en jämförelse (t.ex. "2 656 besök", "127 besök", "111 konverteringar") skrivs UTAN tecken.
- Skriv aldrig tecken på ett tal som inte faktiskt gått upp eller ner mot förra perioden.

=== dashboard_hero ===
ROLL: Du ger ägaren ett omedelbart svar på om det gick bra eller dåligt — och varför det spelar roll för verksamheten. Inte en sammanfattning av mätningen. Ett omdöme. Ta ställning: är det positivt, negativt, eller blandat? Varje mening har ett enda jobb. Ägaren ska läsa tre meningar och känna "nu vet jag hur det gick."
DATA: visits=${fmtNum(visits)}, visitsDelta=${fmtDelta(visitsDelta)}, topChannel=${topChannelLabel}${topChannelPct != null ? ` (${topChannelPct}%)` : ""}, attributionUnclear=${attributionUnclear}, attributionNote=${attributionNote ?? "ingen"}, bounceRate=${bounceRate != null ? `${bounceRate.toFixed(1)}%` : "ej mätt"}
CONSTRAINT: Returnera { "headline": "max 8 ord — ta ställning, nämn det viktigaste som hänt", "sub": "Exakt 3 meningar, max 15 ord vardera. Mening 1: vad hände (ett tal, ingen kanal). Mening 2: är det bra eller dåligt — ta ställning, förklara affärsmässigt. Mening 3: det enda ägaren bör hålla koll på nu." }
EXEMPEL:
  FEL headline: "Trafiken har ökat" — ingen ståndpunkt, kunde gälla vem som helst
  FEL headline: "Ökning i besök denna period" — generisk, inget omdöme
  RÄTT headline: "Färre besök – men fler verkar vara rätt besökare" — tar ställning, blandat läge
  RÄTT headline: "Google driver mer trafik – en tydlig förbättring" — konkret, med omdöme
  FEL sub: "Det kom 6 182 besök från obetald trafik från sociala medier som stod för 90 % av trafiken, en nedgång på −15 %." — en mening med tre fakta, inget omdöme
  RÄTT sub: "Webbplatsen fick 6 182 besök — 15 % färre än förra perioden. Det är en nedgång, men besökarna som kom verkar mer intresserade än tidigare. Håll koll på om konverteringsgraden håller i sig när trafiken återhämtar sig."
STATUS: ${sufficient.dashboard_hero ? "GENERATE" : "INSUFFICIENT DATA"}

=== slide_hero ===
ROLL: Ägaren har redan läst omdömet på dashboarden och öppnat rapporten för att förstå varför. Din uppgift är att förklara orsaken — inte upprepa vad som hände. Vad ligger bakom förändringen? Vad bör de förstå innan de går igenom resten av rapporten? Skriv som en erfaren kollega som förklarar sammanhanget, inte som ett system som rapporterar mätvärden.
DATA: visits=${fmtNum(visits)}, visitsDelta=${fmtDelta(visitsDelta)}, topChannel=${topChannelLabel}${topChannelPct != null ? ` (${topChannelPct}%)` : ""}, attributionUnclear=${attributionUnclear}, attributionNote=${attributionNote ?? "ingen"}, bounceRate=${bounceRate != null ? `${bounceRate.toFixed(1)}%` : "ej mätt"}
CONSTRAINT: MÅSTE returnera en sträng — aldrig null. Exakt 3 korta meningar, HÖGST 35 ord totalt och högst 14 ord per mening — texten ska rymmas på en bild bredvid nästa steg, så skär bort allt som inte bär information. Börja INTE med "Besöken", "Trafiken" eller en siffra — börja med orsaken eller sammanhanget. Mening 1: den troligaste förklaringen till det som hänt (använd "Det kan bero på", "En sannolik förklaring är" — aldrig tvärsäker). Mening 2: vad det betyder för verksamheten, inte för mätningen. Mening 3: vad de ska ha i bakhuvudet när de läser resten av rapporten. Inga rubriker, inga listor.
EXEMPEL:
  FEL: "Besöken minskade med 15 % och direkttrafiken stod för 90 % av trafiken." — upprepar dashboarden, förklarar ingenting
  FEL: "Trafiken ökade denna period med stöd från direkttrafik." — börjar med trafiken, ingen förklaring
  RÄTT (31 ord): "Det kan bero på att ni publicerat mindre i sociala medier. Det betyder färre nya personer som hittar till er just nu. Titta på konverteringarna — lägre volym kan dölja bättre kvalitet."
  RÄTT (32 ord): "En sannolik förklaring är att Google-synligheten förbättrats, vilket tar några veckor att synas. Google-besökare har ofta ett tydligare syfte. Se vilka sidor som fått mest trafik — de visar vad besökarna letar efter."
STATUS: GENERATE

=== slide_insight ===
ROLL: Strategisk analytiker. Din uppgift är att förklara vad som faktiskt händer i affären — inte bara lista siffror. Lär ägaren något: förklara vad en siffra betyder, inte bara att den ändrats. Stycke 1: vad har hänt (med siffra). Stycke 2: varför kan det vara så, och vad bör ägaren göra. Skriv som en kunnig rådgivare som pratar direkt med ägaren, inte som ett rapportsystem.
DATA: ${JSON.stringify(insightsForSurface(insights, "slide_insight").map((i) => ({ type: i.type, severity: i.severity, metrics: i.metrics })))}
CONSTRAINT: Returnera { "body": ["stycke 1", "stycke 2"], "bottom_line": "1 skarp mening som sammanfattar affärsläget" }. EXAKT 2 stycken, max 2 meningar per stycke. Var pedagogisk men koncis — varje mening ska bära information, ingen utfyllnad. bottom_line ska kännas som rådet från en erfaren analytiker — inte en rubrik.
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

=== slide_next_steps ===
ROLL: Rådgivare som säger vad ägaren ska göra härnäst — och exakt varför. Du bestämmer själv hur många steg som behövs: 1 om en enda sak spelar roll, upp till 4 bara om datan verkligen motiverar det. Hellre färre och skarpa än fler och generiska. Varje steg måste följa direkt av en siffra eller ett mönster i datan ovan — föreslå aldrig en kanal, ett verktyg eller en åtgärd som datan inte pekar mot.
DATA: Underlag du kan hänvisa till (nyckel: etikett = värde, föregående):
${Object.entries(evidenceRegistry).map(([key, e]) => `- ${key}: ${e.label} = ${e.value}${e.previous ? ` (föregående: ${e.previous})` : ""}`).join("\n")}
CONSTRAINT: Returnera en array med 1–4 objekt: { "action": "max 6 ord, börjar med ett verb, konkret för just den här verksamheten", "tone": "grow" om steget bygger vidare på något som fungerar, "watch" om det rättar till något som försämrats, "why": "1–2 meningar, HÖGST 30 ord. Förklara exakt varför just detta steg: nämn siffran, vad den betyder för verksamheten och vad steget förväntas ge.", "evidence": ["1–3 nycklar ur listan ovan som steget vilar på — bara nycklar som finns i listan"] }. Upprepa inte formuleringarna från slide_recs.
EXEMPEL:
  FEL action: "Förbättra webbplatsen" — generisk, kunde gälla vem som helst
  FEL action: "Testa Google Ads med en liten budget" — när inget i datan pekar mot annonser
  RÄTT: { "action": "Gör kontaktknappen tydligare", "tone": "watch", "why": "Besöken ökade med +12 % men konverteringsgraden sjönk till 1,8 % — fler hittar hit men färre tar nästa steg. En tydligare knapp på de mest besökta sidorna är det snabbaste sättet att ta tillbaka förfrågningarna.", "evidence": ["conversion_rate", "sessions"] }
STATUS: ${stepsSufficient ? "GENERATE" : "INSUFFICIENT DATA"}

Returnera exakt ett JSON-objekt med dessa nycklar:
{
  "dashboard_hero": null,
  "slide_hero": null,
  "slide_next_steps": null,
  "slide_insight": null,
  "slide_recs": null,
  "slide_recap": null,
  "next_steps": null
}

Byt ut null mot genererat värde för varje yta med STATUS: GENERATE. "next_steps" ska alltid vara null.`;
}
