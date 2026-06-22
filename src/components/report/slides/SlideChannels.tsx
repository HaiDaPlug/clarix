"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { type SlideData } from "../slide-data";
import { fmtNum, sign, TrendPill } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";

const CHANNEL_COLORS = [
  "#FF6B6B", // rose
  "#F59E0B", // amber
  "#6B8FFF", // blue
  "#34C759", // green
  "#A855F7", // purple
  "#F97316", // orange
];

export function SlideChannels({ d }: { d: SlideData }) {
  const reduced = useReducedMotion() === true;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5%" });
  const active = inView || reduced;

  return (
    <div className="space-y-8">
      <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
        Dina bästa trafikkällor
      </SlideHeading>

      <div ref={ref} className="space-y-12">
        {d.topChannels.map((c, i) => {
          const Icon = c.icon;
          const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length];
          const barPct = c.pct;
          const stagger = reduced ? 0 : i * 0.12;
          const isPositive = c.delta !== null && c.delta > 0;

          return (
            <div key={c.name} className="flex items-center gap-5">
              {/* Label col */}
              <div className="flex w-[200px] shrink-0 items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${color}20` }}
                >
                  <Icon className="h-[15px] w-[15px]" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-[16px] font-semibold leading-tight">{c.name}</p>
                    {c.tip.title && (
                      <InfoTooltip
                        title={c.tip.title}
                        body={c.tip.body}
                        example={c.tip.example}
                        side="above"
                      />
                    )}
                  </div>
                  <motion.p
                    className="text-[13px] tabular-nums text-foreground/50"
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{
                      duration: reduced ? 0 : 0.3,
                      delay: reduced ? 0 : stagger + 0.9,
                    }}
                  >
                    {fmtNum(c.visits)} besök
                  </motion.p>
                </div>
              </div>

              {/* Bar wrapper — relative so label floats outside the clipping track */}
              <div className="relative flex-1">
                {/* Track clips the fill */}
                <div
                  className="relative h-[40px] w-full overflow-hidden rounded-[10px]"
                  style={{ background: "#F1F2F4" }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 overflow-hidden rounded-r-[8px]"
                    style={{ background: color }}
                    initial={reduced ? false : { width: "0%" }}
                    animate={{ width: active ? `${barPct}%` : "0%" }}
                    transition={{
                      duration: reduced ? 0 : 1.5,
                      delay: stagger,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <NoiseTexture preset="fine" blendMode="soft-light" opacity={0.3} />
                  </motion.div>
                </div>

                {/* Label slides in from just behind the bar tip */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 flex items-center gap-2"
                  style={{ left: `calc(${barPct}% + 10px)` }}
                  initial={reduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: active ? 1 : 0, x: active ? 0 : (reduced ? 0 : -8) }}
                  transition={{
                    duration: reduced ? 0 : 0.35,
                    delay: reduced ? 0 : stagger + 0.85,
                    ease: "easeOut",
                  }}
                >
                  <p className="font-display text-[26px] font-bold tabular-nums leading-none">
                    {c.pct}%
                  </p>
                  {isPositive && (
                    <TrendPill delta={sign(c.delta)} positive size="sm" />
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
