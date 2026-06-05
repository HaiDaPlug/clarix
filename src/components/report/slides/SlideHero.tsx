"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
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
    <div className="flex h-full flex-col justify-between py-12">
      {/* Top: headline + period context */}
      <div className="text-center space-y-3 mt-16">
        <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem] whitespace-nowrap">
          {headline}<span style={{ color: "#FF6B55" }}>.</span>
        </h1>
        <p className="text-[1.2rem] text-foreground/50 font-medium tracking-tight">
          {hasData ? "Jämfört med föregående period" : "Ingen föregående period att jämföra med"}
        </p>
      </div>

      {/* Middle: sparkline */}
      {d.timeSeries.length > 1 && (
        <div className="w-full h-[72px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.timeSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B55" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#FF6B55" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#FF6B55"
                strokeWidth={2}
                fill="url(#hero-spark)"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

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
            ? <p>{highlightNumbers(withPeriod(aiHero), "dark")}</p>
            : null
        }
      </AISummary>
    </div>
  );
}
