"use client";

import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { type SlideData } from "../slide-data";
import { TrendPill, fmtNum, sign } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";

export function SlidePages({ d }: { d: SlideData }) {
  const rankColors = [
    { tint: "oklch(0.95 0.05 22)", fg: "oklch(0.55 0.18 22)" },
    { tint: "oklch(0.96 0.06 75)", fg: "oklch(0.55 0.14 75)" },
    { tint: "oklch(0.94 0.06 290)", fg: "oklch(0.5 0.18 290)" },
  ];
  const neutral = { tint: "oklch(0.97 0.005 270)", fg: "oklch(0.45 0.02 270)" };
  return (
    <div className="space-y-7">
      <div>
        <SlideHeading sub="De mest besökta sidorna under perioden, topp 6 ser du nedan:">
          Dina mest besökta sidor
        </SlideHeading>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {d.topPages.map((row, i) => {
          const positive = row.d !== null && row.d > 0;
          const r = i < 3 ? rankColors[i] : neutral;
          return (
            <div
              key={row.p}
              className="relative flex flex-col rounded-2xl border border-border bg-background/90 p-5 shadow-[0_2px_4px_rgba(15,23,42,0.03),0_14px_36px_-22px_rgba(15,23,42,0.18)]"
            >
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold tabular-nums"
                  style={{ background: r.tint, color: r.fg }}
                >
                  {i + 1}
                </span>
                <TrendPill delta={sign(row.d)} positive={positive} size="sm" />
              </div>
              <p className="mt-4 truncate font-display text-[24px] font-semibold tracking-tight">
                {row.p}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <p className="font-display text-[30px] font-semibold tabular-nums">
                  {fmtNum(row.v)}
                </p>
                <span className="text-[20px] font-medium text-foreground">besök</span>
                <InfoTooltip title="Vad räknas som ett sidbesök?" body="Antal gånger den här sidan laddades under perioden." example="En besökare som återkommer tre gånger bidrar med 3 sidbesök." side="above" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
