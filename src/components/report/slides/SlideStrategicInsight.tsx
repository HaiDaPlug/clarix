"use client";

import { motion } from "motion/react";
import { NoiseTile } from "@/components/ui/noise-tile";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { type Insight } from "@/lib/engine/derive-insights";
import { deriveSignalCards } from "@/lib/engine/signal-cards";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { TREND_POS, TREND_NEG, ACCENT, AI_GRADIENT, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER, AI_SHIMMER } from "../tokens";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

export function SlideStrategicInsight({
  aiInsights,
  insights,
}: {
  aiInsights: AiInsightsPayload | null;
  insights: Insight[];
}) {
  const { ref, active, reduced } = useSlideReveal();
  const aiInsight = aiInsights?.slide_insight;
  const signals = deriveSignalCards(insights);

  return (
    <div ref={ref} className="grid h-full grid-cols-[1fr_1.05fr] gap-6 content-center">
      {/* Left: heading + signal list */}
      <div className="flex flex-col justify-center gap-6">
        <motion.div {...fadeUp(active, reduced)}>
          <h1 className="font-display text-[2.9rem] font-bold leading-[1.05] tracking-tight lg:text-[3.4rem]">
            Synligheten ökar.<br />Affärsvärdet fångas inte fullt ut<span style={{ color: "#FF6B55" }}>.</span>
          </h1>
          <p className="mt-3 text-[20px] text-foreground leading-relaxed">
            Vad siffrorna faktiskt betyder för er, bortom dashboarden.
          </p>
        </motion.div>
        {signals.length > 0 && (
        <ul className="space-y-3">
          {signals.map((s, i) => (
            <motion.li
              key={s.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 px-5 py-4"
              {...fadeUp(active, reduced, { y: 10, delay: 0.15 + i * 0.08 })}
            >
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: s.positive ? TREND_POS : TREND_NEG, marginTop: 10 }}
              />
              <div>
                <p className="font-semibold text-[19px]">{s.label}</p>
                <p className="mt-0.5 text-[18px] leading-relaxed text-foreground">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
        )}
      </div>

      {/* Right: expanded summary card */}
      <motion.div
        className="relative overflow-hidden rounded-3xl p-8 flex flex-col justify-between"
        style={{ background: AI_GRADIENT, border: `1px solid ${AI_BORDER}`, boxShadow: "0 24px 60px -26px rgba(139,92,246,0.25)" }}
        {...fadeUp(active, reduced, { delay: 0.2 })}
      >
        <div className="pointer-events-none absolute -top-42 -left-34 h-[27rem] w-[27rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55) 0%, oklch(0.85 0.16 300 / 0.28) 34%, transparent 72%)" }} />
        <div className="pointer-events-none absolute -bottom-42 -right-28 h-[27rem] w-[27rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5) 0%, oklch(0.86 0.14 220 / 0.25) 34%, transparent 72%)" }} />
        <NoiseTile blendMode="soft-light" opacity={0.45} />
        <div className="relative z-10 flex flex-col h-full gap-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: AI_TEXT_SECONDARY }}>
            Det vi ser just nu
          </p>
          <div className="flex-1 space-y-4 text-[1.15rem] font-normal leading-[1.65] tracking-[-0.01em]" style={{ color: AI_TEXT_PRIMARY }}>
            {aiInsights === null ? (
              <div className="flex flex-col gap-3">
                {[90, 80, 65].map((w, i) => <div key={i} className="h-4 rounded-full animate-pulse" style={{ width: `${w}%`, background: AI_SHIMMER }} />)}
              </div>
            ) : aiInsight ? (
              aiInsight.body.map((paragraph) => <p key={paragraph}>{highlightNumbers(withPeriod(paragraph), "light")}</p>)
            ) : (
              <>
                <p>Trafiken ökar — men trafik som inte konverterar är bara en kostnad utan avkastning. Det intressanta den här perioden är gapet som börjar öppna sig mellan synlighet och affärseffekt.</p>
                <p>Sjunkande engagemang i kombination med en svagare kontaktsida är ett klassiskt mönster: ni når fler, men budskapet eller flödet håller inte besökaren kvar tillräckligt länge för att ett beslut ska fattas.</p>
                <p>Nästa steg är inte mer trafik. Det är att förstå varför de som redan hittar er väljer att lämna.</p>
              </>
            )}
          </div>
          <div className="flex items-start gap-3 pt-4" style={{ borderTop: `1px solid ${AI_BORDER}` }}>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-white"
              style={{ background: ACCENT }}
            >
              Bottom line
            </span>
            <p className="font-semibold text-[1.05rem] leading-snug" style={{ color: AI_TEXT_PRIMARY }}>
              {aiInsights === null
                ? <span className="block h-4 w-[75%] rounded-full animate-pulse" style={{ background: AI_SHIMMER }} />
                : highlightNumbers(withPeriod(aiInsight?.bottom_line ?? "Synligheten förbättras. Men om engagemanget fortsätter sjunka och kontaktsidan inte återhämtar sig, riskerar ni att trafiktillväxten inte omvandlas till affärer."), "light")
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
