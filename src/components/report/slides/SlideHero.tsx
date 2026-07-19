"use client";

import { motion } from "motion/react";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { type SlideData } from "../slide-data";
import { AI_GRADIENT, AI_SHADOW, AI_BORDER, AI_TEXT_SECONDARY, AI_SHIMMER } from "../tokens";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { NoiseTile } from "@/components/ui/noise-tile";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

export function SlideHero({
  d,
  headline,
  aiInsights,
}: {
  d: SlideData;
  headline: string;
  aiInsights: AiInsightsPayload | null;
}) {
  const { ref, active, reduced } = useSlideReveal();
  const hasData = d.trafficDelta !== null;
  const aiHero = aiInsights?.slide_hero;
  const loading = aiInsights === null;

  return (
    <div
      ref={ref}
      className="relative flex h-full flex-1 overflow-hidden rounded-[2rem] p-16"
      style={{ background: AI_GRADIENT, boxShadow: AI_SHADOW.replace(/_/g, " "), border: `1px solid ${AI_BORDER}` }}
    >
      <div className="pointer-events-none absolute -top-52 -left-40 h-[30rem] w-[30rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55) 0%, oklch(0.85 0.16 300 / 0.28) 34%, transparent 72%)" }} />
      <div className="pointer-events-none absolute -bottom-56 -right-34 h-[36rem] w-[36rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5) 0%, oklch(0.86 0.14 220 / 0.25) 34%, transparent 72%)" }} />
      <NoiseTile blendMode="soft-light" opacity={0.45} />

      <div className="relative z-10 grid h-full w-full grid-cols-12 items-center gap-10">
        {/* Left: eyebrow + headline — mirrors DashboardHero's "Denna vecka" column */}
        <motion.div className="col-span-5 flex flex-col gap-3" {...fadeUp(active, reduced)}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "oklch(0.62 0.22 295)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: AI_TEXT_SECONDARY }}>
              {hasData ? "Jämfört med föregående period" : "Ingen jämförelseperiod"}
            </p>
          </div>
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="h-12 w-[95%] rounded-full" style={{ background: AI_SHIMMER }} />
              <div className="h-12 w-[85%] rounded-full" style={{ background: AI_SHIMMER }} />
              <div className="h-12 w-[55%] rounded-full" style={{ background: AI_SHIMMER }} />
            </div>
          ) : (
            <h2 className="font-display2 text-[3rem] leading-[1.05] tracking-tight" style={{ color: "oklch(0.2 0.04 290)" }}>
              {headline}<span style={{ color: "#FF6B55" }}>.</span>
            </h2>
          )}
        </motion.div>

        {/* Right: white glass card — mirrors DashboardHero's insight panel */}
        <motion.div className="col-span-7" {...fadeUp(active, reduced, { delay: 0.15 })}>
          {/* 0.7 + backdrop-blur-sm → 0.85 flat: the blur only smoothed the
              static gradient + noise grain behind the card; higher opacity
              halves the grain transmission for the same glass read, minus the
              per-scroll backdrop-filter cost. */}
          <div
            className="rounded-2xl p-9 shadow-[0_20px_50px_-20px_rgba(139,92,246,0.15)]"
            style={{ background: "oklch(1 0 0 / 0.85)", border: "1px solid oklch(0.78 0.06 295 / 0.4)" }}
          >
            {loading ? (
              <div className="flex flex-col gap-4">
                <div className="h-8 w-[92%] rounded-full" style={{ background: AI_SHIMMER }} />
                <div className="h-8 w-[88%] rounded-full" style={{ background: AI_SHIMMER }} />
                <div className="h-8 w-[80%] rounded-full" style={{ background: AI_SHIMMER }} />
                <div className="h-8 w-[45%] rounded-full" style={{ background: AI_SHIMMER }} />
              </div>
            ) : (
              <p className="text-[1.7rem] font-medium leading-[1.45] tracking-normal" style={{ color: "rgba(30,20,60,0.9)" }}>
                {aiHero ? highlightNumbers(withPeriod(aiHero), "light") : null}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
