import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiInsightsProviderError } from "./generate";

// Stub both SDKs so tests never make real network calls.
// Must use class syntax so `new SDK()` works as a constructor.
vi.mock("@anthropic-ai/sdk", () => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: '{"ok":true}' }],
  });
  class Anthropic {
    messages = { create };
  }
  return { default: Anthropic };
});

vi.mock("openai", () => {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"ok":true}' } }],
  });
  class OpenAI {
    chat = { completions: { create } };
  }
  return { default: OpenAI };
});

// Re-import after mocks are registered.
const { generateAiInsightsText } = await import("./generate");

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("generateAiInsightsText — provider selection", () => {
  it("throws AiInsightsProviderError when AI_INSIGHTS_PROVIDER is not set", async () => {
    vi.stubEnv("AI_INSIGHTS_PROVIDER", "");
    await expect(generateAiInsightsText("test")).rejects.toThrow(AiInsightsProviderError);
    await expect(generateAiInsightsText("test")).rejects.toThrow("AI_INSIGHTS_PROVIDER is not set");
  });

  it("throws AiInsightsProviderError for an unknown provider value", async () => {
    vi.stubEnv("AI_INSIGHTS_PROVIDER", "cohere");
    await expect(generateAiInsightsText("test")).rejects.toThrow(AiInsightsProviderError);
    await expect(generateAiInsightsText("test")).rejects.toThrow("Unknown AI_INSIGHTS_PROVIDER");
  });

  it("throws AiInsightsProviderError when provider is openai but OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("AI_INSIGHTS_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(generateAiInsightsText("test")).rejects.toThrow(AiInsightsProviderError);
    await expect(generateAiInsightsText("test")).rejects.toThrow("OPENAI_API_KEY is not set");
  });

  it("throws AiInsightsProviderError when provider is anthropic but ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("AI_INSIGHTS_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(generateAiInsightsText("test")).rejects.toThrow(AiInsightsProviderError);
    await expect(generateAiInsightsText("test")).rejects.toThrow("ANTHROPIC_API_KEY is not set");
  });

  it("calls openai and returns raw text when configured correctly", async () => {
    vi.stubEnv("AI_INSIGHTS_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const result = await generateAiInsightsText("test prompt");
    expect(result).toBe('{"ok":true}');
  });

  it("calls anthropic and returns raw text when configured correctly", async () => {
    vi.stubEnv("AI_INSIGHTS_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    const result = await generateAiInsightsText("test prompt");
    expect(result).toBe('{"ok":true}');
  });
});
