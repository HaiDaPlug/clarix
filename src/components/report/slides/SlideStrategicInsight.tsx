"use client";

import { motion } from "motion/react";
import { NoiseTile } from "@/components/ui/noise-tile";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { type Insight } from "@/lib/engine/derive-insights";
import { deriveSignalCards } from "@/lib/engine/signal-cards";
import { deriveSlideHeadline } from "@/lib/engine/slide-headlines";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { TREND_POS, TREND_NEG, AI_GRADIENT, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER, AI_SHIMMER } from "../tokens";
import { Eyebrow } from "../primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

/** Keeps the sentence's closing mark but always renders it in coral. */
function splitTerminal(text: string): { body: string; mark: string } {
  const trimmed = text.trim();
  const m = trimmed.match(/([.!?…])$/);
  return m ? { body: trimmed.slice(0, -1), mark: m[1] } : { body: trimmed, mark: "." };
}

/**
 * The assessment, as conclusion then evidence. The analyst's bottom line is
 * the heading; the reasoning and the data's own signals sit under it. When
 * generation failed the heading falls back to the rule-based headline for
 * this client's data and the reasoning card is left out: no stand-in text.
 */
export function SlideStrategicInsight({
  aiInsights,
  insights,
}: {
  aiInsights: AiInsightsPayload | null;
  insights: Insight[];
}) {
  const { ref, active, reduced } = useSlideReveal();
  const loading = aiInsights === null;
  const aiInsight = aiInsights?.slide_insight ?? null;
  const signals = deriveSignalCards(insights);
  const conclusion = splitTerminal(aiInsight?.bottom_line ?? deriveSlideHeadline(insights));
  const showReasoning = loading || !!aiInsight;

  return (
    <div ref={ref} className={`grid h-full content-center gap-8 ${showReasoning ? "grid-cols-[1fr_1.05fr]" : "grid-cols-1 max-w-4xl"}`}>
      {/* Conclusion, then the signals that back it */}
      <div className="flex flex-col justify-center gap-6">
        <motion.div {...fadeUp(active, reduced)}>
          <Eyebrow>Bedömning</Eyebrow>
          {loading ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="h-10 w-[95%] rounded-full animate-pulse bg-muted" />
              <div className="h-10 w-[70%] rounded-full animate-pulse bg-muted" />
            </div>
          ) : (
            <h1 className="mt-3 font-display text-[2.5rem] font-bold leading-[1.1] tracking-tight" style={{ textWrap: "balance" }}>
              {highlightNumbers(conclusion.body, "light")}
              <span style={{ color: "#FF6B55" }}>{conclusion.mark}</span>
            </h1>
          )}
        </motion.div>
        {signals.length > 0 && (
          <ul className="space-y-2.5">
            {signals.map((s, i) => (
              <motion.li
                key={s.label}
                className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 px-5 py-3.5"
                {...fadeUp(active, reduced, { y: 10, delay: 0.15 + i * 0.08 })}
              >
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full" style={{ background: s.positive ? TREND_POS : TREND_NEG }} aria-hidden />
                <div>
                  <p className="text-[18px] font-semibold">{s.label}</p>
                  <p className="mt-0.5 text-[16.5px] leading-snug text-foreground/80">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* The reasoning behind the conclusion */}
      {showReasoning && (
        <motion.div
          className="relative flex flex-col justify-center overflow-hidden rounded-3xl p-9"
          style={{ background: AI_GRADIENT, border: `1px solid ${AI_BORDER}`, boxShadow: "0 24px 60px -26px rgba(139,92,246,0.25)" }}
          {...fadeUp(active, reduced, { delay: 0.2 })}
        >
          <div className="pointer-events-none absolute -top-42 -left-34 h-[27rem] w-[27rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55) 0%, oklch(0.85 0.16 300 / 0.28) 34%, transparent 72%)" }} />
          <div className="pointer-events-none absolute -bottom-42 -right-28 h-[27rem] w-[27rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5) 0%, oklch(0.86 0.14 220 / 0.25) 34%, transparent 72%)" }} />
          <NoiseTile blendMode="soft-light" opacity={0.45} />
          <div className="relative z-10 flex flex-col gap-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: AI_TEXT_SECONDARY }}>
              Därför
            </p>
            <div className="space-y-4 text-[1.2rem] font-normal leading-[1.6] tracking-[-0.01em]" style={{ color: AI_TEXT_PRIMARY }}>
              {loading || !aiInsight ? (
                <div className="flex flex-col gap-3">
                  {[90, 80, 65, 85].map((w, i) => <div key={i} className="h-4 rounded-full animate-pulse" style={{ width: `${w}%`, background: AI_SHIMMER }} />)}
                </div>
              ) : (
                aiInsight.body.map((paragraph) => <p key={paragraph}>{highlightNumbers(withPeriod(paragraph), "light")}</p>)
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
