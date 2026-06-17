"use client";

import { motion } from "motion/react";
import { ReportData } from "@/types/schema";
import { withPeriod } from "@/lib/utils/text";
import { deriveNextSteps } from "@/lib/dashboard/next-steps";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import { ShimmerCard } from "@/components/primitives/ShimmerCard";
import { AI_SHIMMER } from "@/components/report/tokens";

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
      className="rounded-2xl border border-border bg-background p-6"
    >
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/45 mb-1">
          Prioriterat
        </p>
        <p className="font-display text-[1.5rem] font-bold leading-none tracking-tight">
          Nästa steg
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 + i * 0.06, ease: [0.0, 0.0, 0.2, 1] }}
            className="flex items-start gap-4 rounded-xl border border-border bg-muted/40 px-4 py-4"
          >
            <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full mt-0.5 text-[12px] font-bold text-foreground/50 border border-border bg-background">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold leading-snug text-foreground mb-1">
                {step.action}
              </p>
              {loading ? (
                <ShimmerCard
                  loading
                  height={16}
                  style={{ border: "none", borderRadius: 999, backgroundColor: AI_SHIMMER }}
                />
              ) : (
                <p className="text-[14px] leading-relaxed text-foreground/60">
                  {withPeriod(aiInsights?.next_steps?.[i]?.rationale ?? step.rationale)}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
