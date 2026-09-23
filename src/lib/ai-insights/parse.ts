// Turning the model's raw text into a payload the cache and UI can trust:
// tolerant JSON extraction, then the per-slot sufficiency gate.
import type { AiInsightsPayload } from "@/lib/ai-insights/types";
import type { InsightSurface } from "@/lib/engine/derive-insights";

export function extractJsonObject(raw: string): unknown {
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

export function applySufficiencyGate(
  payload: AiInsightsPayload,
  sufficient: Record<InsightSurface, boolean>,
  stepsSufficient: boolean,
  evidenceKeys: Set<string>,
): AiInsightsPayload {
  // Keys the model made up are dropped here, so the slide never looks up a
  // figure that does not exist.
  const steps = payload.slide_next_steps?.map((step) => ({
    ...step,
    evidence: [...new Set(step.evidence)].filter((key) => evidenceKeys.has(key)).slice(0, 3),
  })) ?? null;
  return {
    dashboard_hero: sufficient.dashboard_hero ? payload.dashboard_hero : null,
    next_steps: sufficient.next_steps ? payload.next_steps : null,
    slide_hero: sufficient.slide_hero ? payload.slide_hero : null,
    slide_next_steps: stepsSufficient ? steps : null,
    slide_insight: sufficient.slide_insight ? payload.slide_insight : null,
    slide_recs: sufficient.slide_recs ? payload.slide_recs : null,
    slide_recap: sufficient.slide_recap ? payload.slide_recap : null,
  };
}
