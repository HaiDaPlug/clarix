"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { buildEvidenceRegistry } from "@/lib/ai-insights/evidence";
import type { ReportData } from "@/types/schema";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { SlideHeading } from "../primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "../primitives/reveal";
import { STEP_TONE, stepEvidence } from "../next-step-parts";

// Card columns follow the number of steps the model chose (1–4).
const COLS: Record<number, string> = { 1: "grid-cols-1 max-w-2xl", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

/**
 * The action slide. The summary names the steps; this slide gives each one
 * its reason and the figures it rests on, in that order: what to do, why,
 * and the numbers behind it. Everything comes from the model's
 * slide_next_steps and the report data: the slide is left out of the deck
 * when there are no steps (see slide-list), never filled with stand-ins.
 */
export function SlideRecommendations({
  aiInsights,
  reportData,
}: {
  aiInsights: AiInsightsPayload | null;
  reportData: ReportData | null;
}) {
  const { ref, active, reduced } = useSlideReveal();
  const steps = aiInsights?.slide_next_steps ?? null;
  const loading = aiInsights === null;
  const registry = useMemo(() => (reportData ? buildEvidenceRegistry(reportData) : {}), [reportData]);
  const count = steps?.length ?? 3;

  return (
    <div ref={ref} className="flex h-full flex-col gap-6">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub={count === 1 ? "Det som gör störst skillnad just nu — och varför." : "Vad som gör störst skillnad just nu — och varför."}>
          Nästa steg
        </SlideHeading>
      </motion.div>

      <div className={`grid min-h-0 flex-1 gap-4 ${COLS[count] ?? "grid-cols-3"}`}>
        {loading || !steps
          ? [0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-3 rounded-3xl border border-border bg-background/95 p-6" aria-hidden>
                <div className="h-5 w-24 rounded-full animate-pulse bg-muted" />
                <div className="h-7 w-[80%] rounded-full animate-pulse bg-muted" />
                <div className="mt-2 h-4 w-[92%] rounded-full animate-pulse bg-muted" />
                <div className="h-4 w-[70%] rounded-full animate-pulse bg-muted" />
              </div>
            ))
          : steps.map((step, index) => {
              const tone = STEP_TONE[step.tone];
              const evidence = stepEvidence(step, registry);
              return (
                <motion.article
                  key={`${index}-${step.action}`}
                  className="flex min-h-0 flex-col rounded-3xl border bg-background/95 p-6"
                  style={{ borderColor: tone.border }}
                  {...fadeUp(active, reduced, { y: 16, delay: 0.15 + index * 0.1 })}
                >
                  {/* What to do */}
                  <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground/70">
                    <span className="h-2 w-2 rounded-full" style={{ background: tone.dot }} aria-hidden />
                    {tone.label}
                  </p>
                  <h3 className="mt-3 font-display text-[24px] font-bold leading-[1.15] tracking-tight" style={{ textWrap: "balance" }}>
                    {step.action}
                  </h3>
                  {/* Why */}
                  <p className="mt-3 text-[16.5px] leading-snug text-foreground/85">
                    {highlightNumbers(withPeriod(step.why), "light", "signed")}
                  </p>
                  {/* The numbers behind it, read from the data */}
                  {evidence.length > 0 && (
                    <dl className="mt-auto flex flex-col gap-1.5 border-t border-border pt-3.5">
                      {evidence.map((e) => (
                        <div key={e.label} className="flex items-baseline justify-between gap-3">
                          <dt className="truncate text-[13px] text-foreground/60">{e.label}</dt>
                          <dd className="shrink-0 text-right tabular-nums">
                            <span className="font-stat text-[16px] font-semibold">{e.value}</span>
                            {e.previous && <span className="ml-1.5 text-[12px] text-foreground/50">föreg. {e.previous}</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </motion.article>
              );
            })}
      </div>
    </div>
  );
}
