import type { AiNextStep } from "@/lib/ai-insights/types";
import type { Evidence } from "@/lib/ai-insights/evidence";
import { TREND_POS } from "./tokens";

/**
 * How a next step reads, shared by the summary slide, the "Nästa steg" slide
 * and the phone report. "grow" builds on something that works (the deck's
 * positive green); "watch" corrects something that slipped (brand coral, not
 * trend red: it's a thing to act on, not an alarm).
 */
export const STEP_TONE = {
  grow: { label: "Bygg vidare", dot: TREND_POS, border: "oklch(0.7 0.16 155 / 0.28)" },
  watch: { label: "Åtgärda", dot: "#FF6B55", border: "oklch(0.7 0.19 35 / 0.28)" },
} as const;

/** The figures a step rests on. The model names registry keys; the values
 *  come from the data, so nothing shown here can be invented. */
export function stepEvidence(step: AiNextStep, registry: Record<string, Evidence>): Evidence[] {
  return step.evidence.map((key) => registry[key]).filter((e): e is Evidence => !!e);
}
