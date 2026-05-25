"use client";

import { motion } from "motion/react";
import { ReportData } from "@/types/schema";
import { withPeriod } from "@/lib/utils/text";
import { deriveNextSteps, type Effort, type Reward } from "@/lib/dashboard/next-steps";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import { ShimmerCard } from "@/components/primitives/ShimmerCard";

const EFFORT_COLOR: Record<Effort, string> = {
  låg:   "oklch(0.62 0.22 155)",
  medel: "oklch(0.65 0.18 65)",
  hög:   "oklch(0.55 0.22 25)",
};

const REWARD_COLOR: Record<Reward, string> = {
  låg:   "oklch(0.55 0.08 250)",
  medel: "oklch(0.62 0.22 155)",
  hög:   "oklch(0.52 0.22 295)",
};

export function NextStepsCard({
  data,
  aiInsights,
  loading,
}: {
  data: ReportData;
  aiInsights: AiInsightsPayload | null;
  loading: boolean;
}) {
  const steps = deriveNextSteps(data);
  if (!steps.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1], delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="eyebrow mb-1" style={{ color: "var(--slate)" }}>Prioriterat</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em", color: "var(--charcoal)" }}>
            Nästa steg
          </p>
        </div>
        <div className="flex items-center gap-4" style={{ fontSize: "11px", color: "var(--slate)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: EFFORT_COLOR["låg"] }} />
            Effort
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: REWARD_COLOR["hög"] }} />
            Vinst
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 + i * 0.06, ease: [0.0, 0.0, 0.2, 1] }}
            className="flex items-start gap-4 rounded-xl px-4 py-3.5"
            style={{ background: "color-mix(in oklch, var(--bone) 60%, white)", border: "1px solid var(--rule)" }}
          >
            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full mt-0.5" style={{ background: "var(--charcoal)", color: "var(--bone)", fontSize: "11px", fontWeight: 700 }}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--charcoal)", lineHeight: 1.35, marginBottom: "3px" }}>{step.action}</p>
              {loading ? (
                <ShimmerCard
                  loading
                  height={18}
                  style={{ border: "none", borderRadius: 999, backgroundColor: "color-mix(in oklch, var(--rule) 70%, white)" }}
                />
              ) : (
                <p style={{ fontSize: "12.5px", color: "var(--slate)", lineHeight: 1.5 }}>
                  {withPeriod(aiInsights?.next_steps?.[i]?.rationale ?? step.rationale)}
                </p>
              )}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: `color-mix(in oklch, ${EFFORT_COLOR[step.effort]} 12%, transparent)`, color: EFFORT_COLOR[step.effort] }}>
                Effort: {step.effort}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: `color-mix(in oklch, ${REWARD_COLOR[step.reward]} 12%, transparent)`, color: REWARD_COLOR[step.reward] }}>
                Vinst: {step.reward}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
