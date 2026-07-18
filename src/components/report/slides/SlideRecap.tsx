"use client";

import { motion } from "motion/react";
import { Compass, Lightbulb, TrendingUp } from "lucide-react";
import Link from "next/link";
import { NoiseTile } from "@/components/ui/noise-tile";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { TREND_POS, TREND_POS_BG, ACCENT, AI_GRADIENT, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER } from "../tokens";
import { SlideHeading } from "../primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

export function SlideRecap({
  aiInsights,
}: {
  aiInsights: AiInsightsPayload | null;
}) {
  const { ref, active, reduced } = useSlideReveal();
  const aiRecap = aiInsights?.slide_recap;
  const bullets = [
    {
      t: "Trafiken växer",
      b: "Google fortsätter driva tillväxten — håll publiceringstempot.",
      positive: true,
    },
    {
      t: "Engagemanget behöver omsorg",
      b: "Besökstiden sjunker. Innehåll och layout är värt att se över.",
      positive: false,
    },
    {
      t: "AI-synligheten är omätt",
      b: "Aktivera spårning för att inte missa nästa söktrend.",
      positive: false,
    },
  ].map((bullet, index) => ({
    ...bullet,
    b: aiInsights === null ? null : aiRecap?.[index]?.body ?? bullet.b,
  }));

  return (
    <div ref={ref} className="grid h-full content-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-6">
        <motion.div {...fadeUp(active, reduced)}>
          <SlideHeading sub="Tre rader att ta med sig från perioden.">
            Tre saker att komma ihåg
          </SlideHeading>
        </motion.div>
        <ul className="space-y-4">
          {bullets.map((b, i) => (
            <motion.li
              key={b.t}
              className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 p-4 sm:p-5"
              {...fadeUp(active, reduced, { y: 10, delay: 0.15 + i * 0.08 })}
            >
              <span
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: b.positive
                    ? TREND_POS_BG
                    : "oklch(0.94 0.04 60 / 0.6)",
                  color: b.positive ? TREND_POS : "oklch(0.55 0.14 60)",
                }}
              >
                {b.positive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <Compass className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="font-semibold">{b.t}</p>
                {b.b === null
                  ? <div className="mt-1 flex flex-col gap-1.5"><div className="h-4 w-[85%] rounded-full animate-pulse bg-muted" /><div className="h-4 w-[55%] rounded-full animate-pulse bg-muted" /></div>
                  : <p className="mt-1 text-[20px] text-foreground">{highlightNumbers(withPeriod(b.b), "light")}</p>
                }
              </div>
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
