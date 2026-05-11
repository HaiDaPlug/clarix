"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AssembledDashboardItem } from "@/types/dashboard";
import { Metric, ReportData } from "@/types/schema";
import { useLocale, Translations } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils/format";
import { DeltaText } from "@/components/dashboard/metrics";

const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

export const CHANNEL_COLORS = [
  { stroke: "#E8524A", bg: "rgba(232,82,74,0.10)", label: "#C0392B" },
  { stroke: "#8B5CF6", bg: "rgba(139,92,246,0.10)", label: "#7C3AED" },
  { stroke: "#F5A623", bg: "rgba(245,166,35,0.10)", label: "#D4870F" },
  { stroke: "#2D6A4F", bg: "rgba(45,106,79,0.10)", label: "#1E4D39" },
  { stroke: "#0EA5E9", bg: "rgba(14,165,233,0.10)", label: "#0369A1" },
  { stroke: "#6B6760", bg: "rgba(107,103,96,0.10)", label: "#4A4540" },
];

export function getChannelRows(data: ReportData, t: Translations) {
  const traffic = data.trafficOverview;
  if (!traffic) return [];

  if (traffic.channelBreakdown?.length) {
    return traffic.channelBreakdown.map((channel) => {
      const metric: Metric | undefined =
        channel.previousSessions !== undefined
          ? {
              value: channel.sessions,
              previousValue: channel.previousSessions,
              unit: "number" as const,
              label: channel.channel,
              trend: channel.sessions > channel.previousSessions ? "up" : channel.sessions < channel.previousSessions ? "down" : "flat",
              trendGood: true,
            }
          : undefined;
      return { label: channel.channel, value: channel.sessions, share: channel.share, metric };
    });
  }

  return [
    { label: t.dashboard.channels.organicSearch, metric: traffic.organicSessions },
    { label: t.dashboard.channels.paidSearch, metric: traffic.paidSessions },
    { label: t.dashboard.channels.direct, metric: traffic.directSessions },
  ]
    .filter((row): row is { label: string; metric: Metric } => Boolean(row.metric))
    .map((row) => ({
      label: row.label,
      value: row.metric.value,
      share: traffic.totalSessions.value ? Math.round((row.metric.value / traffic.totalSessions.value) * 100) : 0,
      metric: row.metric,
    }));
}

function DonutChart({
  segments,
  totalSessions,
  hoveredIndex,
  onHover,
}: {
  segments: { share: number; value: number; label: string }[];
  totalSessions: number;
  hoveredIndex: number | null;
  onHover: (i: number | null) => void;
}) {
  const R = 84, CX = 110, CY = 110, strokeW = 22, gapDeg = 2.8;
  const circumference = 2 * Math.PI * R;

  type Arc = { color: string; dashArray: string; dashOffset: string; rotation: number; index: number };
  const arcs: Arc[] = [];
  let cursor = -90;

  segments.forEach((seg, i) => {
    const deg = (seg.share / 100) * 360;
    const usableFrac = Math.max(0, deg - gapDeg) / 360;
    const dashLen = usableFrac * circumference;
    arcs.push({
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length].stroke,
      dashArray: `${dashLen} ${circumference - dashLen}`,
      dashOffset: `${circumference * 0.25}`,
      rotation: cursor,
      index: i,
    });
    cursor += deg;
  });

  const active = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <svg viewBox="0 0 220 220" width="220" height="220" style={{ display: "block", overflow: "visible" }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--rule)" strokeWidth={strokeW} />
      {arcs.map((arc) => {
        const isHovered = hoveredIndex === arc.index;
        const isDimmed = hoveredIndex !== null && !isHovered;
        const dashLen = parseFloat(arc.dashArray.split(" ")[0]);
        return (
          <motion.circle
            key={arc.index}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={isHovered ? strokeW + 4 : strokeW}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="round"
            transform={`rotate(${arc.rotation}, ${CX}, ${CY})`}
            style={{ cursor: "pointer" }}
            initial={{ strokeDashoffset: parseFloat(arc.dashOffset) + dashLen, opacity: 0 }}
            animate={{ strokeDashoffset: parseFloat(arc.dashOffset), opacity: isDimmed ? 0.22 : 1 }}
            transition={{
              strokeDashoffset: { duration: 0.75, delay: 0.1 + arc.index * 0.1, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.25, delay: 0.08 + arc.index * 0.1 },
              strokeWidth: { duration: 0.18 },
            }}
            onMouseEnter={() => onHover(arc.index)}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}
      <text x={CX} y={CY - 12} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: "9px", fontWeight: 500, fill: "var(--slate)", letterSpacing: "0.1em", textTransform: "uppercase", pointerEvents: "none" }}>
        {active ? active.label.toUpperCase().slice(0, 10) : "TOTALT"}
      </text>
      <text x={CX} y={CY + 18} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: active ? "26px" : "30px", fontWeight: 700, fill: "var(--charcoal)", letterSpacing: "-0.03em", pointerEvents: "none" }}>
        {active ? formatNumber(active.value, "number") : totalSessions >= 1000 ? `${(totalSessions / 1000).toFixed(1)}k` : String(totalSessions)}
      </text>
      {active && (
        <text x={CX} y={CY + 34} textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 600, fill: CHANNEL_COLORS.find((_, ci) => segments[ci]?.label === active.label)?.stroke ?? "var(--slate)", pointerEvents: "none" }}>
          {Math.round(active.share)}%
        </text>
      )}
    </svg>
  );
}

export function ChannelBreakdown({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const rows = getChannelRows(data, t);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!rows.length) return null;

  const isFull = item.eligibility.variant === "full";
  const total = data.trafficOverview?.totalSessions.value ?? rows.reduce((s, r) => s + r.value, 0);
  const segments = rows.map((r) => ({ ...r }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <p className="eyebrow mb-4" style={{ color: "var(--slate)" }}>{t.dashboard.channels.eyebrow}</p>
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <DonutChart segments={segments} totalSessions={total} hoveredIndex={hoveredIndex} onHover={setHoveredIndex} />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {rows.map((row, i) => {
            const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length];
            const pct = Math.round(row.share);
            const isActive = hoveredIndex === i;
            const isDimmed = hoveredIndex !== null && !isActive;
            return (
              <div
                key={row.label}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-default"
                style={{
                  background: isActive ? color.bg : "transparent",
                  border: `1px solid ${isActive ? color.stroke + "35" : "transparent"}`,
                  opacity: isDimmed ? 0.35 : 1,
                  transition: "background 0.18s ease, opacity 0.18s ease, border-color 0.18s ease",
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span className="shrink-0 rounded-sm" style={{ width: "3px", height: "24px", background: color.stroke, opacity: isDimmed ? 0.5 : 1, borderRadius: "2px" }} />
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "var(--slate)", lineHeight: 1.2 }}>{row.label}</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.03em", color: isActive ? color.label : "var(--charcoal)", lineHeight: 1, fontVariantNumeric: "tabular-nums", transition: "color 0.18s ease" }}>
                      {formatNumber(row.value, "number")}
                    </span>
                    {isFull && row.metric && <DeltaText metric={row.metric} />}
                  </div>
                  <div className="mt-1.5 h-0.5 w-full rounded-full" style={{ background: "var(--rule)", position: "relative" }}>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: "100%", width: `${row.share}%`, background: color.stroke, transformOrigin: "50% 50%", borderRadius: "9999px" }}
                    />
                  </div>
                </div>
                <span className="shrink-0 rounded-full px-2 py-1" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.03em", background: isActive ? color.stroke : "var(--rule)", color: isActive ? "white" : "var(--slate)", transition: "background 0.18s ease, color 0.18s ease", minWidth: "36px", textAlign: "center" }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
