import { z } from "zod";

export const AI_INSIGHTS_FALLBACK_TEXT =
  "Inte nog med data för att bedöma din digitala närvaro.";

export const AI_INSIGHTS_PROMPT_VERSION = "ai-insights-v3";

export const AiInsightsPayloadSchema = z.object({
  dashboard_hero: z
    .object({
      headline: z.string().min(1),
      sub: z.string().min(1),
    })
    .nullable(),
  next_steps: z
    .array(
      z.object({
        rationale: z.string().min(1),
      }),
    )
    .max(3)
    .nullable(),
  slide_hero: z.string().min(1).nullable(),
  slide_insight: z
    .object({
      body: z.array(z.string().min(1)).min(1).max(3),
      bottom_line: z.string().min(1),
    })
    .nullable(),
  slide_recs: z
    .array(
      z.object({
        body: z.string().min(1),
      }),
    )
    .max(3)
    .nullable(),
  slide_recap: z
    .array(
      z.object({
        body: z.string().min(1),
      }),
    )
    .max(3)
    .nullable(),
});

export type AiInsightsPayload = z.infer<typeof AiInsightsPayloadSchema>;

export function createNullAiInsightsPayload(): AiInsightsPayload {
  return {
    dashboard_hero: null,
    next_steps: null,
    slide_hero: null,
    slide_insight: null,
    slide_recs: null,
    slide_recap: null,
  };
}
