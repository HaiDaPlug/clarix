"use client";

import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { NoiseTile } from "@/components/ui/noise-tile";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { ACCENT, AI_GRADIENT, AI_TEXT_PRIMARY, AI_BORDER } from "../tokens";
import { SlideHeading } from "../primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

export function SlideRecap({
  aiInsights,
}: {
  aiInsights: AiInsightsPayload | null;
}) {
  const { ref, active, reduced } = useSlideReveal();
  // The model's three lines, as written. No titles over them: a fixed title
  // ("Trafiken växer") would claim something this client's data may not say.
  // Left out of the deck when there is nothing to show (see slide-list).
  const lines = aiInsights === null ? null : (aiInsights.slide_recap ?? []).map((r) => r.body);

  return (
    <div ref={ref} className="grid h-full content-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-6">
        <motion.div {...fadeUp(active, reduced)}>
          <SlideHeading sub="Det viktigaste att ta med sig från perioden.">
            Kort summerat
          </SlideHeading>
        </motion.div>
        <ul className="space-y-3">
          {lines === null
            ? [85, 70, 78].map((w, i) => (
                <li key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-background/80 p-5" aria-hidden>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted" />
                  <div className="h-5 rounded-full animate-pulse bg-muted" style={{ width: `${w}%` }} />
                </li>
              ))
            : lines.map((line, i) => (
                <motion.li
                  key={line}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 px-5 py-4"
                  {...fadeUp(active, reduced, { y: 10, delay: 0.15 + i * 0.08 })}
                >
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full" style={{ background: "#FF6B55" }} aria-hidden />
                  <p className="text-[21px] font-medium leading-snug">{highlightNumbers(withPeriod(line), "light")}</p>
                </motion.li>
              ))}
        </ul>
      </div>
      <motion.div
        className="relative overflow-hidden flex flex-col justify-between gap-6 rounded-3xl p-8"
        style={{ background: AI_GRADIENT, border: `1px solid ${AI_BORDER}`, boxShadow: "0 24px 60px -26px rgba(139,92,246,0.25)" }}
        {...fadeUp(active, reduced, { delay: 0.2 })}
      >
        <div className="pointer-events-none absolute -top-42 -left-34 h-[27rem] w-[27rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55) 0%, oklch(0.85 0.16 300 / 0.28) 34%, transparent 72%)" }} />
        <div className="pointer-events-none absolute -bottom-42 -right-28 h-[27rem] w-[27rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5) 0%, oklch(0.86 0.14 220 / 0.25) 34%, transparent 72%)" }} />
        <NoiseTile blendMode="soft-light" opacity={0.45} />
        <div className="relative z-10 flex flex-col justify-between gap-6 flex-1">
          <div>
            <h2 className="font-display text-4xl tracking-tight sm:text-5xl" style={{ color: AI_TEXT_PRIMARY }}>
              Boka en kort genomgång — vi går igenom rapporten tillsammans.
            </h2>
            <p className="mt-3 text-[20px]" style={{ color: AI_TEXT_PRIMARY }}>
              30 minuter. Inga säljpitcher. Bara konkreta nästa steg för din sida.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
              style={{ background: ACCENT }}
            >
              <Lightbulb className="h-4 w-4" />
              Boka strategigenomgång
            </button>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-5 py-3 text-sm font-semibold hover:bg-muted"
            >
              Se detaljerad rapport
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
