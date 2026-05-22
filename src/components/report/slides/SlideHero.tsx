"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { type AiInsightsPayload, AI_INSIGHTS_FALLBACK_TEXT } from "@/lib/ai-insights/types";
import { type SlideData } from "../slide-data";
import { TREND_POS, TREND_NEG } from "../tokens";
import { AISummary, pos, trendSpan } from "../primitives/AISummary";
import { fmtNum, sign } from "../primitives/TrendPill";

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
      {/* Top: headline + stat */}
      <div className="text-center space-y-5 mt-16">
        <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem] whitespace-nowrap">
          {headline}<span style={{ color: "#FF6B55" }}>.</span>
        </h1>
        <p className="text-[1.6rem] leading-[1.4] text-foreground">
          {!hasData ? (
            "Ingen föregående period med data finns att jämföra."
          ) : (
            <>
              Trafiken under perioden har {isPos ? "gått upp" : "gått ner"}{" "}
              <span className="font-bold tabular-nums" style={{ color: isPos ? TREND_POS : TREND_NEG }}>
                {sign(d.trafficDelta)!}
              </span>{" "}
              under perioden.
            </>
          )}
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

      {/* Bottom: AI summary card */}
      <AISummary>
        {aiHero === null ? (
          <p>{AI_INSIGHTS_FALLBACK_TEXT}</p>
        ) : aiHero ? (
          <p>{aiHero}</p>
        ) : (
          <>
            <p>
              Den här perioden fick din hemsida {pos(fmtNum(d.visits))} besök —
              cirka {pos(fmtNum(Math.abs(d.visits - d.prevVisits)))} fler än förra
              månaden.
            </p>
            <p>
              Google var din starkaste trafikkälla och växte mest (
              {trendSpan(d.trafficDelta, sign(d.trafficDelta))}). Samtidigt tappade kontaktsidan trafik,
              vilket är viktigt eftersom leads ofta kommer därifrån.
            </p>
          </>
        )}
      </AISummary>
    </div>
  );
}
