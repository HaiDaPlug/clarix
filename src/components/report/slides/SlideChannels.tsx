"use client";

import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { type SlideData } from "../slide-data";
import { TrendPill, fmtNum, sign } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";

const PASTELS = [
  { bg: "#FFF0F0", border: "#FFD6D6", icon: "#FF6B6B" }, // rose
  { bg: "#FFF4E8", border: "#FFD9A8", icon: "#F59E0B" }, // amber
  { bg: "#EEF4FF", border: "#C7D9FF", icon: "#6B8FFF" }, // blue
  { bg: "#F0FFF4", border: "#BBF7D0", icon: "#34C759" }, // green
  { bg: "#FDF4FF", border: "#E9C7FF", icon: "#A855F7" }, // purple
  { bg: "#FFF8F0", border: "#FFD9A8", icon: "#F97316" }, // orange
];

export function SlideChannels({ d }: { d: SlideData }) {
  return (
    <div className="space-y-4">
      <div>
        <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
          Dina bästa trafikkällor
        </SlideHeading>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {d.topChannels.map((c, i) => {
          const Icon = c.icon;
          const isLastOdd = d.topChannels.length % 2 !== 0 && i === d.topChannels.length - 1;
          const p = PASTELS[i % PASTELS.length];
          return (
            <div
              key={c.name}
              className={`relative flex flex-col rounded-2xl p-5 ${isLastOdd ? "col-span-2" : ""}`}
              style={{ background: p.bg, border: `1.5px solid ${p.border}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "white", border: `1px solid ${p.border}` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: p.icon }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[19px] font-bold leading-tight truncate">{c.name}</p>
                      {c.tip.title && <InfoTooltip title={c.tip.title} body={c.tip.body} example={c.tip.example} side="above" />}
                    </div>
                    <p className="truncate text-[16px] text-foreground/60 mt-0.5">{c.sub}</p>
                  </div>
                </div>
                <TrendPill delta={sign(c.delta)} positive={c.delta !== null && c.delta > 0} size="sm" />
              </div>
              <div className="mt-4">
                <p className="font-display text-[42px] font-bold leading-none tabular-nums tracking-tight">{c.pct}%</p>
                <p className="mt-1.5 text-[17px] tabular-nums text-foreground/60">{fmtNum(c.visits)} besök</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
