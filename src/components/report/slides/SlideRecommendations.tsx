"use client";

import { motion } from "motion/react";
import { PenSquare, Target, Zap } from "lucide-react";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { SlideHeading } from "../primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

export function SlideRecommendations({ aiInsights }: { aiInsights: AiInsightsPayload | null }) {
  const { ref, active, reduced } = useSlideReveal();
  const aiRecs = aiInsights?.slide_recs;
  const actions = [
    {
      tag: "Skala",
      icon: Zap,
      t: "Dubbla det som fungerar",
      b: "SEO-guiden drar 4 200 besök. Tre likvärdiga guider kan dubbla SEO-trafiken på ett kvartal.",
    },
    {
      tag: "Fixa",
      icon: Target,
      t: "Tät läckan vid kontakt",
      b: "Kontaktsidan tappar trafik. Tydligare CTA + kortare formulär kan återta förlorade leads.",
    },
    {
      tag: "Bygg",
      icon: PenSquare,
      t: "Bygg momentum",
      b: "Publicera 1 artikel i veckan. Konsekvensen har gett +14 % senaste perioden — håll tempot.",
    },
  ];
  return (
    <div ref={ref} className="flex h-full flex-col gap-5">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub="Tre fokusområden att prioritera den närmaste perioden.">
          Rekommenderade fokusområden
        </SlideHeading>
      </motion.div>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-3">
        {actions.map((a, index) => {
          const Icon = a.icon;
          const body = aiInsights === null
            ? null
            : aiRecs?.[index]?.body ?? a.b;
          return (
            <motion.div
              key={a.t}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background/95 p-5 shadow-[0_4px_8px_rgba(15,23,42,0.03),0_18px_44px_-22px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5"
              {...fadeUp(active, reduced, { y: 16, delay: 0.15 + index * 0.1 })}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #FF4D9E 0%, #FF6B55 50%, #FFB830 100%)" }}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground">
                  {a.tag}
                </span>
              </div>
              <h3 className="mt-4 font-display text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
                {a.t}
              </h3>
              {/* Tuned to the 2:1 canvas: the card clips its overflow, and a
                  long two-sentence rec ran past the bottom edge. Nothing here
                  caps the model's length, so this fits the prompt's upper
                  bound with room, not the copy we happen to see today. */}
              <div className="mt-2.5 text-[20px] leading-snug text-foreground">
                {body === null
                  ? <div className="flex flex-col gap-2"><div className="h-4 w-[90%] rounded-full animate-pulse bg-muted" /><div className="h-4 w-[65%] rounded-full animate-pulse bg-muted" /></div>
                  : <p>{highlightNumbers(withPeriod(body), "light")}</p>
                }
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
