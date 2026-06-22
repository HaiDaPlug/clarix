"use client";

import { type AiInsightsPayload } from "@/lib/ai-insights/types";

function Shimmer({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2 pt-0.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-[1.15em] rounded-full animate-pulse bg-white/25"
          style={{ width: i === lines - 1 ? "65%" : "90%" }}
        />
      ))}
    </div>
  );
}
import { type SlideData } from "../slide-data";
import { TREND_POS, TREND_NEG } from "../tokens";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { AISummary, pos } from "../primitives/AISummary";
import { fmtNum } from "../primitives/TrendPill";

export function SlideHero({
  d,
  headline,
  aiInsights,
}: {
  d: SlideData;
  headline: string;
  aiInsights: AiInsightsPayload | null;
}) {
  const hasData = d.trafficDelta !== null;
  const isPos = (d.trafficDelta ?? 0) > 0;
  const aiHero = aiInsights?.slide_hero;

  return (
    <div className="flex h-full flex-col justify-center gap-10 py-8">
      {/* Top: headline + period context */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem] whitespace-nowrap">
          {headline}<span style={{ color: "#FF6B55" }}>.</span>
        </h1>
        <p className="text-[1.2rem] text-foreground/50 font-medium tracking-tight">
          {hasData ? "Jämfört med föregående period." : "Ingen föregående period att jämföra med."}
        </p>
      </div>

      {/* Bottom: summary card */}
      <AISummary>
        {/* Line 1: visit count + delta only when a prior period exists */}
        <p>
          Den här perioden fick din hemsida {pos(fmtNum(d.visits))} besök
          {hasData && d.trafficDelta !== null ? (
            <> —{" "}
              <span className="font-bold" style={{ color: isPos ? TREND_POS : TREND_NEG }}>
                {isPos ? "+" : ""}{d.trafficDelta}%
              </span>
              {" "}jämfört med föregående period.</>
          ) : (
            <>.</>
          )}
        </p>
        {/* Line 2: shimmer → AI → nothing */}
        {aiInsights === null
          ? <Shimmer lines={1} />
          : aiHero
            ? <p>{highlightNumbers(withPeriod(aiHero), "light")}</p>
            : null
        }
      </AISummary>
    </div>
  );
}
