"use client";

import { useState } from "react";
import { type SlideData } from "../slide-data";
import { SlideHeading } from "../primitives/SlideHeading";
import { TREND_POS, TREND_NEG } from "../tokens";

function TrendCell({ trend, delta }: { trend: "up" | "down" | "flat" | null; delta: number | null }) {
  if (!trend || trend === "flat") {
    return <span className="text-[15px]" style={{ color: "var(--muted-foreground)" }}>—</span>;
  }
  const isUp = trend === "up";
  const color = isUp ? TREND_POS : TREND_NEG;
  return (
    <span className="inline-flex items-center gap-1 text-[14px] font-semibold tabular-nums" style={{ color }}>
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
        {isUp
          ? <path d="M6 10V2M2 6l4-4 4 4" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M6 2v8M2 6l4 4 4-4" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
      {delta !== null ? `${delta > 0 ? "+" : ""}${delta}%` : null}
    </span>
  );
}

function Favicon({ domain, fallbackLetter }: { domain: string; fallbackLetter: string }) {
  const [failed, setFailed] = useState(false);
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const src = `/api/favicon?domain=${cleanDomain}`;

  if (failed) {
    return (
      <div className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-[15px] font-bold" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
        {fallbackLetter}
      </div>
    );
  }

  return (
    <div className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: "var(--muted)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={20} height={20} onError={() => setFailed(true)} />
    </div>
  );
}

export function SlidePages({ d }: { d: SlideData }) {
  const domain = d.clientDomain ?? "example.com";
  const fallback = domain.replace("www.", "").slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col gap-6 h-full">
      <SlideHeading sub="De mest besökta sidorna under perioden.">
        Dina mest besökta sidor
      </SlideHeading>

      <div className="flex flex-col divide-y divide-border/75 rounded-2xl border border-border bg-background/90 overflow-hidden">
        {/* Header */}
        <div className="grid items-center px-5 py-3.5" style={{ gridTemplateColumns: "1fr 120px 110px" }}>
          <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-foreground/50">Sida</span>
          <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-foreground/50 text-center">Trend</span>
          <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-foreground/50 text-right">Besök</span>
        </div>

        {d.topPages.map((row) => {
          const label = row.title ?? row.p;
          const shortUrl = row.p.length > 42 ? row.p.slice(0, 42) + "…" : row.p;
          return (
            <div
              key={row.p}
              className="grid items-center px-5 py-4 hover:bg-muted/30 transition-colors"
              style={{ gridTemplateColumns: "1fr 120px 110px" }}
            >
              {/* Page */}
              <div className="flex items-center gap-3.5 min-w-0">
                <Favicon domain={domain} fallbackLetter={fallback} />
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold leading-tight truncate text-foreground">{label}</p>
                  <p className="text-[14px] text-foreground/50 truncate mt-0.5">{shortUrl}</p>
                </div>
              </div>

              {/* Trend + delta */}
              <div className="flex items-center justify-center">
                <TrendCell trend={row.trend} delta={row.d} />
              </div>

              {/* Visit count */}
              <div className="text-right">
                <span className="font-display text-[22px] font-bold tabular-nums tracking-tight text-foreground">
                  {row.v.toLocaleString("sv-SE")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
