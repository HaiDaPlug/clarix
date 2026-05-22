"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type SlideData } from "../slide-data";
import { TrendPill, sign, formatDuration } from "../primitives/TrendPill";

export function SlideTrend({ d }: { d: SlideData }) {
  const accent = "#FF6B55";

  const topThree = d.topChannels.slice(0, 3);
  const rightStats: { label: string; value: string; delta?: number | null }[] = [
    ...topThree.map((c) => ({ label: c.name, value: c.visits.toLocaleString("sv-SE"), delta: c.delta })),
    ...(d.bounceRate != null ? [{ label: "Avvisningsfrekvens", value: `${d.bounceRate.toFixed(1)}%` }] : []),
    ...(d.avgDuration != null ? [{ label: "Genomsn. besökstid", value: formatDuration(d.avgDuration) }] : []),
  ];

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem]">
          Så hittar besökarna till er<span style={{ color: "#FF6B55" }}>.</span>
        </h1>
        <p className="mt-1 text-[21px] text-foreground">{d.period}</p>
      </div>

      {/* Main row: chart left, stats right */}
      <div className="grid grid-cols-[1fr_196px] gap-4 flex-1 min-h-0">

        {/* Chart card */}
        <div className="rounded-2xl border border-border/60 bg-background/70 p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
            <div>
              <p className="text-[18px] font-semibold uppercase tracking-[0.2em] text-foreground">Totala besök</p>
              <p className="font-display text-[3.3rem] font-bold leading-none tracking-tight tabular-nums mt-0.5">
                {d.visits.toLocaleString("sv-SE")}
              </p>
            </div>
            <TrendPill delta={sign(d.trafficDelta)} positive={d.trafficDelta !== null && d.trafficDelta > 0} size="lg" />
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.timeSeries} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="r2-t-accent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(d.timeSeries.length / 7) - 1)}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return v;
                    return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                <ReTooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(value) => [typeof value === "number" ? value.toLocaleString("sv-SE") : value, "Sessioner"]}
                  labelFormatter={(v) => {
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return v;
                    return d.toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" });
                  }}
                />
                <Area type="monotone" dataKey="sessions" stroke={accent} strokeWidth={2.5} fill="url(#r2-t-accent)" dot={false} activeDot={{ r: 4, fill: accent, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Channel share footer */}
          {d.topChannels.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50 shrink-0">
              <div className="flex gap-4">
                {d.topChannels.slice(0, 5).map((ch, i) => (
                  <div key={ch.name} className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1 mb-2">
                      <span className={`truncate ${i === 0 ? "text-[14px] font-semibold" : "text-[13px] text-foreground"}`}>{ch.name}</span>
                      <span className={`shrink-0 tabular-nums ${i === 0 ? "text-[16px] font-bold" : "text-[14px] font-semibold"}`}>{ch.pct}%</span>
                    </div>
                    <div className={`rounded-full bg-border/40 overflow-hidden ${i === 0 ? "h-[6px]" : "h-[4px]"}`}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${ch.pct}%`,
                          background: i === 0
                            ? "linear-gradient(90deg, #FF4D9E 0%, #FF6B55 50%, #FFB830 100%)"
                            : "linear-gradient(90deg, #FF6B55 0%, #FFB830 100%)",
                          opacity: i === 0 ? 1 : 0.65,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right stats column */}
        <div className="rounded-2xl border border-border/60 bg-background/70 px-5 py-5 flex flex-col min-h-0 overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground mb-3 shrink-0">
            Per kanal
          </p>
          <div className="flex flex-col flex-1 min-h-0 divide-y divide-border/50 overflow-hidden">
            {rightStats.map((s) => (
              <div key={s.label} className="flex flex-col justify-center py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground mb-1 leading-tight">
                  {s.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-[1.7rem] font-bold leading-none tracking-tight tabular-nums">
                    {s.value}
                  </p>
                  {s.delta !== undefined && (
                    <TrendPill delta={sign(s.delta ?? null)} positive={s.delta !== undefined && s.delta !== null && s.delta > 0} size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
