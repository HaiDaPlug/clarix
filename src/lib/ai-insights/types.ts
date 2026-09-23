import { z } from "zod";

export const AI_INSIGHTS_FALLBACK_TEXT =
  "Inte nog med data för att bedöma din digitala närvaro.";

// Bump when the prompt copy changes (logged only — does not invalidate cache).
export const AI_INSIGHTS_PROMPT_VERSION = "ai-insights-v15";

// Bump when anything that affects model output changes: prompt logic, classifier
// rules, derived-insights behavior, schema shape. This is the single lever that
// intentionally busts all user caches for a given period.
export const AI_INSIGHTS_CACHE_VERSION = "cache-v4";

export const AiInsightsPayloadSchema = z.object({
  dashboard_hero: z
    .object({
      headline: z.string().min(1),
      sub: z.string().min(1),
    })
    .nullable(),
  // Retired 2026-09-22: every surface reads slide_next_steps now and the
  // prompt no longer asks for this. Kept (always null) so cached rows and
  // the payload shape stay valid; .catch so a stray value can't fail a parse.
  next_steps: z
    .array(
      z.object({
        rationale: z.string().min(1),
      }),
    )
    .max(3)
    .nullable()
    .catch(null),
  slide_hero: z.string().min(1).nullable(),
  // The model decides the steps and how many (1–4). It cites evidence by
  // registry key only (see evidence.ts); the figures come from the data.
  // Lenient on purpose: a missing or malformed list becomes null (rows cached
  // before this slot existed, a bad model turn) instead of failing the whole
  // payload and taking every other slot down with it.
  slide_next_steps: z
    .array(
      z.object({
        action: z.string().min(1),
        tone: z.enum(["grow", "watch"]).catch("grow"),
        why: z.string().min(1),
        evidence: z.array(z.string()).catch([]),
      }),
    )
    .nullable()
    .transform((steps) => (steps && steps.length > 0 ? steps.slice(0, 4) : null))
    .catch(null),
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
export type AiNextStep = NonNullable<AiInsightsPayload["slide_next_steps"]>[number];

export function createNullAiInsightsPayload(): AiInsightsPayload {
  return {
    dashboard_hero: null,
    next_steps: null,
    slide_hero: null,
    slide_next_steps: null,
    slide_insight: null,
    slide_recs: null,
    slide_recap: null,
  };
}
