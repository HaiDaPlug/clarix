"use client";

import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { type SlideData } from "../slide-data";
import { TrendPill, fmtNum, sign } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";

export function SlideChannels({ d }: { d: SlideData }) {
  return (
    <div className="space-y-6">
      <div>
        <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
          Dina bästa trafikkällor
        </SlideHeading>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {d.topChannels.map((c, i) => {
          const Icon = c.icon;
          const isLastOdd = d.topChannels.length % 2 !== 0 && i === d.topChannels.length - 1;
          return (
            <div
              key={c.name}
              className={`relative flex flex-col rounded-2xl border bg-background/90 p-5 shadow-[0_2px_4px_rgba(15,23,42,0.03),0_14px_36px_-22px_rgba(15,23,42,0.18)] ${
                c.featured ? "border-foreground/15 ring-1 ring-foreground/5" : "border-border"
              } ${isLastOdd ? "col-span-2" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "oklch(0.97 0.012 30)",
                    border: "1px solid oklch(0.90 0.02 30)",
                    color: "oklch(0.48 0.10 30)",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[22px] font-semibold leading-tight">{c.name}</p>
                    {c.tip.title && <InfoTooltip title={c.tip.title} body={c.tip.body} example={c.tip.example} side="above" />}
                  </div>
                  <p className="truncate text-[20px] text-foreground">{c.sub}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-[38px] font-semibold tabular-nums">{c.pct}%</p>
                  <p className="mt-0.5 text-[20px] tabular-nums text-foreground">{fmtNum(c.visits)} besök</p>
                </div>
                <TrendPill delta={sign(c.delta)} positive={c.delta !== null && c.delta > 0} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
