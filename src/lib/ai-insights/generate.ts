// Provider adapter for AI insights generation.
// Returns raw model text only — JSON parsing and validation stay in the route.
//
// Configure via env:
//   AI_INSIGHTS_PROVIDER=openai|anthropic  (required)
//   OPENAI_API_KEY / OPENAI_MODEL
//   ANTHROPIC_API_KEY / ANTHROPIC_MODEL

const SYSTEM_PROMPT = "Du är Clarix. Returnera alltid giltig JSON och inget annat.";

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
    max_tokens: 1400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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
    max_tokens: 1400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0]?.type === "text" ? message.content[0].text : "";
}
