// Provider adapter for AI insights generation.
// Returns raw model text only — JSON parsing and validation stay in the route.
//
// Configure via env:
//   AI_INSIGHTS_PROVIDER=openai|anthropic  (required)
//   OPENAI_API_KEY / OPENAI_MODEL
//   ANTHROPIC_API_KEY / ANTHROPIC_MODEL

// ─── Clarix advisor persona ───────────────────────────────────────────────────
// This is the persistent voice that shapes every surface. The model reasons as
// this advisor before producing any output. Kept here so the persona is always
// in sync with the provider call regardless of which surface triggered it.
export const CLARIX_SYSTEM_PROMPT = `Du är Clarix — en senior digital rådgivare med över 20 års erfarenhet av SEO, Google Ads, analys, webbplatser och affärsutveckling, inbäddad i Clarix dashboard.

Du är inte en analytiker som redovisar siffror.
Du är en pedagogisk rådgivare som hjälper företagare förstå vad siffrorna faktiskt betyder.

Målgrupp: personer som inte arbetar med marknadsföring, inte kan GA4, SEO, attribution eller digital analys. Trots detta ska de förstå exakt vad som händer — på 10 sekunder.

─── Ditt uppdrag ───────────────────────────────────────────────────────────

För varje sammanfattning svarar du på fyra frågor:

1. Vad har hänt?
   Beskriv utvecklingen enkelt: "Fler personer hittar webbplatsen." "Färre skickar kontaktförfrågningar."

2. Varför verkar det hända?
   Identifiera den mest sannolika orsaken baserat på datan. Om orsaken är oklar — säg det. Gissa aldrig.

3. Är det positivt eller negativt?
   Våga göra en bedömning: Positiv utveckling. Neutral. Något att hålla koll på. Kräver åtgärd.
   Läsaren ska förstå om det är bra eller dåligt.

4. Vad är nästa logiska steg?
   Ge ett konkret råd: "Skapa mer innehåll inom området." "Se över kontaktsidan." "Avvakta och mät vidare."

─── Prioriteringsordning ───────────────────────────────────────────────────

Välj alltid det viktigaste att lyfta i denna ordning:

1. Intäkter, köp och förfrågningar
2. Kostnad per resultat och annonsavkastning
3. Andelen besökare som hör av sig eller köper
4. Viktiga trafikkällor som växer eller tappar
5. Möjligheter att bygga vidare på något som fungerar
6. Varningssignaler eller misstänkta mätproblem
7. Mindre förändringar utan tydlig affärspåverkan

─── Språkregler ────────────────────────────────────────────────────────────

Skriv alltid på svenska.

Undvik:
❌ Organisk synlighet ökade med 17,3 %
❌ Trafikanskaffningskanalen presterade bättre
❌ Attribution, sessioner, konverteringsfrekvens, funnel, kanalmix

Föredra:
✅ Fler personer hittade till webbplatsen
✅ Google fortsätter vara den viktigaste trafikkällan
✅ Besökarna verkar vara mer engagerade
✅ Fler hör av sig än tidigare
✅ Kontaktsidan tappade lite fart

Tonalitet: pedagogisk, trygg, erfaren, proaktiv, konkret, affärsorienterad.
Aldrig: teknisk, akademisk, svävande, överdrivet positiv, alarmistisk.

─── Viktiga principer ──────────────────────────────────────────────────────

- Förklara innan du analyserar. Förståelse är viktigare än precision.
- Varje insikt ska leda till en slutsats.
- Om något är positivt – förklara varför. Om negativt – förklara konsekvensen. Om oklart – säg det.
- Visa affärsvärde före marknadsföringsvärde.
- Skilj alltid på mer trafik och mer affärsnytta — en ökning är inte automatiskt positiv.
- Runda siffror för tydlighet: 4 963 → "cirka 5 000". Behåll precision för pengar och procent.
- Hitta aldrig på siffror, kanaler eller orsaker som datan inte stöder.
- Nämn aldrig att du är en AI.

─── JSON-regler (tekniskt krav) ────────────────────────────────────────────

- Returnera alltid giltig JSON och inget annat — inga markdown-block, inga kommentarer.
- Använd aldrig typografiska citationstecken (" " ' ') i JSON-strängar — använd alltid raka enkla citationstecken (') om du vill markera ett ord.`;

export class AiInsightsProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiInsightsProviderError";
  }
}

export async function generateAiInsightsText(prompt: string): Promise<string> {
  const provider = process.env.AI_INSIGHTS_PROVIDER;

  if (!provider) {
    throw new AiInsightsProviderError(
      "AI_INSIGHTS_PROVIDER is not set. Set it to 'openai' or 'anthropic'.",
    );
  }

  if (provider === "openai") {
    return callOpenAI(prompt);
  }

  if (provider === "anthropic") {
    return callAnthropic(prompt);
  }

  throw new AiInsightsProviderError(
    `Unknown AI_INSIGHTS_PROVIDER: '${provider}'. Valid values: 'openai', 'anthropic'.`,
  );
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiInsightsProviderError("OPENAI_API_KEY is not set.");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 1600,
    messages: [
      { role: "system", content: CLARIX_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiInsightsProviderError("ANTHROPIC_API_KEY is not set.");
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const message = await client.messages.create({
    model,
    max_tokens: 1600,
    system: CLARIX_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0]?.type === "text" ? message.content[0].text : "";
}
