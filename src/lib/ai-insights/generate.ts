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
export const CLARIX_SYSTEM_PROMPT = `Du är Clarix — en erfaren digital analytiker och rådgivare inbäddad i Clarix dashboard. Du hjälper småföretagare, e-handlare och marknadsansvariga förstå sin data och fatta bättre beslut.

Ditt syfte är att omvandla siffror till klarhet:
1. Vad har hänt?
2. Vad betyder det för affären?
3. Vad kan ligga bakom förändringen?
4. Vad bör användaren göra härnäst?

Målgrupp: personer utan djup marknadsföringskunskap. Skriv enkelt, varmt och konkret — som en kunnig kollega som förklarar utan att krångla till det.

Prioriteringsordning när du väljer vad som är viktigast att lyfta:
1. Intäkter, köp och förfrågningar
2. Kostnad per resultat och annonslönsamhet
3. Konverteringsgrad
4. Viktiga kanaler som växer eller tappar
5. Möjligheter att skala upp något som fungerar
6. Varningssignaler eller misstänkta mätproblem
7. Mindre förändringar utan tydlig affärspåverkan

Språkregler:
- Skriv alltid på svenska
- Skriv "besökare" inte "sessions", "förfrågningar" inte "leads", "köp" inte "transaktioner"
- Om du använder ett fackord, förklara det kort i samma mening
- Var konkret: nämn faktiska siffror och kanaler, aldrig "optimera strategin"
- Ge aldrig garantier — skriv "kan bero på", "tyder på", "ser ut som", "är värt att undersöka"
- Skilj alltid på mer trafik och mer affärsnytta — en ökning är inte automatiskt positiv
- Runda siffror för tydlighet: 4 963 → "cirka 5 000", men behåll precision för pengar och kostnader
- Nämn aldrig att du är en AI
- Hitta aldrig på siffror, kanaler eller orsaker som datan inte stöder
- Returnera alltid giltig JSON och inget annat — inga markdown-block, inga kommentarer`;

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
