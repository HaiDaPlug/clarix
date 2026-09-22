"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AssembledDashboardItem } from "@/types/dashboard";
import { Metric, ReportData } from "@/types/schema";
import { useLocale, Translations } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils/format";
import { DeltaText } from "@/components/dashboard/metrics";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { channelColorByKey } from "@/components/report/channel-colors";
import { useTheme } from "@/lib/theme";

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

// Display names match the report's (see slide-data.tsx) so a customer reads
// the same channel name on both screens.
const CHANNEL_INFO: Record<string, { name: string; sub: string; info: string }> = {
  organic: {
    name: "Google (obetalt)",
    sub: "Besök från Googles vanliga sökresultat",
    info: "Det här är personer som hittade företaget via Google utan att man betalat för klicket.",
  },
  paid: {
    name: "Google Ads",
    sub: "Köpt trafik från Google",
    info: "Besökare som kom via en betald annons i Google Sök eller Display.",
  },
  social: {
    name: "Sociala medier",
    sub: "Besök från inlägg och delningar i sociala medier",
    info: "Det här är personer som klickat in från exempelvis LinkedIn, Facebook eller Instagram.",
  },
  "paid-social": {
    name: "Betald social",
    sub: "Köpt trafik från sociala medier",
    info: "Besökare som kom via en betald annons på Facebook, Instagram, LinkedIn eller TikTok.",
  },
  direct: {
    name: "Direkttrafik",
    sub: "Besökare som gick direkt till hemsidan",
    info: "Det här är personer som redan känner till företaget och själva skrev in webbadressen eller använde ett bokmärke.",
  },
  referral: {
    name: "Referral",
    sub: "Länkar från andra sajter",
    info: "Besökare som kommit via en länk på en annan webbplats.",
  },
  email: {
    name: "E-post",
    sub: "Nyhetsbrev & utskick",
    info: "Besökare som klickat via ett e-postutskick eller nyhetsbrev.",
  },
  unassigned: {
    name: "Okänd trafik",
    sub: "Trafik som inte kunnat kopplas tydligt till en källa",
    info: "Ibland saknas tillräcklig information för att systemet ska kunna avgöra exakt var trafiken kom ifrån.",
  },
};

// Map display labels (from data) back to a canonical channel key. Social is
// tested first: "Paid Social" contains "paid" and "Organic Social" contains
// "organic", and both used to be filed under Google — a paid Facebook
// campaign showed up on the dashboard as Google Ads.
export function inferChannelKey(rawChannel: string): string {
  const lower = rawChannel.toLowerCase();
  const social = lower.includes("social") || lower.includes("sociala");
  if (social) {
    return lower.includes("paid") || lower.includes("betald") ? "paid-social" : "social";
  }
  if (lower.includes("organic") || lower.includes("organisk") || lower.includes("google seo") || lower.includes("obetal")) return "organic";
  if (lower.includes("paid") || lower.includes("betald") || lower.includes("ads")) return "paid";
  if (lower.includes("direct") || lower.includes("direkt")) return "direct";
  if (lower.includes("referral") || lower.includes("hänvisning")) return "referral";
  if (lower.includes("email") || lower.includes("e-post") || lower.includes("mail")) return "email";
  if (lower.includes("unassigned") || lower.includes("ej tilldelad") || lower.includes("okänd")) return "unassigned";
  return lower;
}

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
      return {
        label: channel.channel,
        channelKey: inferChannelKey(channel.channel),
        value: channel.sessions,
        share: channel.share,
        metric,
      };
    });
  }

  return [
    { label: t.dashboard.channels.organicSearch, channelKey: "organic", metric: traffic.organicSessions },
    { label: t.dashboard.channels.paidSearch, channelKey: "paid", metric: traffic.paidSessions },
    { label: t.dashboard.channels.direct, channelKey: "direct", metric: traffic.directSessions },
  ]
    .filter((row): row is { label: string; channelKey: string; metric: Metric } => Boolean(row.metric))
    .map((row) => ({
      label: row.label,
      channelKey: row.channelKey,
      value: row.metric.value,
      share: traffic.totalSessions.value ? Math.round((row.metric.value / traffic.totalSessions.value) * 100) : 0,
      metric: row.metric,
    }));
}

type Segment = { share: number; value: number; label: string; color: string };

function DonutChart({
  segments,
  totalSessions,
  hoveredIndex,
  onHover,
  reduced,
}: {
  segments: Segment[];
  totalSessions: number;
  hoveredIndex: number | null;
  onHover: (i: number | null) => void;
  reduced: boolean;
}) {
  const R = 84, CX = 110, CY = 110, strokeW = 18, gapDeg = 3;
  const circumference = 2 * Math.PI * R;

  type Arc = { color: string; dashArray: string; dashOffset: number; rotation: number; index: number; dashLen: number };
  const arcs: Arc[] = [];
  let cursor = -90;

  segments.forEach((seg, i) => {
    const deg = (seg.share / 100) * 360;
    const usableFrac = Math.max(0, deg - gapDeg) / 360;
    const dashLen = usableFrac * circumference;
    arcs.push({
      color: seg.color,
      dashArray: `${dashLen} ${circumference - dashLen}`,
      dashOffset: circumference * 0.25,
      rotation: cursor,
      index: i,
      dashLen,
    });
    cursor += deg;
  });

  const active = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <svg viewBox="0 0 220 220" width="220" height="220" style={{ display: "block", overflow: "visible" }} role="img" aria-label="Fördelning av besök per kanal">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line-soft)" strokeWidth={strokeW} />
      {arcs.map((arc) => {
        const isHovered = hoveredIndex === arc.index;
        const isDimmed = hoveredIndex !== null && !isHovered;
        return (
          <motion.circle
            key={arc.index}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeW}
            strokeDasharray={arc.dashArray}
            strokeLinecap="butt"
            transform={`rotate(${arc.rotation}, ${CX}, ${CY})`}
            style={{ cursor: "pointer" }}
            initial={reduced ? false : { strokeDashoffset: arc.dashOffset + arc.dashLen, opacity: 0 }}
            animate={{ strokeDashoffset: arc.dashOffset, opacity: isDimmed ? 0.25 : 1 }}
            transition={{
              strokeDashoffset: { duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.05 * arc.index, ease: EASE_OUT },
              opacity: { duration: 0.18 },
            }}
            onMouseEnter={() => onHover(arc.index)}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}
      <text x={CX} y={CY - 12} textAnchor="middle" style={{ fontFamily: "var(--font-body)", fontSize: "10px", fontWeight: 500, fill: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", pointerEvents: "none" }}>
        {active ? active.label.toUpperCase().slice(0, 14) : "TOTALT"}
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle" style={{ fontFamily: "var(--font-numeric)", fontVariantNumeric: "tabular-nums", fontSize: active ? "24px" : "26px", fontWeight: 600, fill: "var(--text-primary)", letterSpacing: "-0.02em", pointerEvents: "none" }}>
        {formatNumber(active ? active.value : totalSessions, "number")}
      </text>
      {active && (
        <text x={CX} y={CY + 32} textAnchor="middle" style={{ fontFamily: "var(--font-numeric)", fontVariantNumeric: "tabular-nums", fontSize: "12px", fontWeight: 600, fill: "var(--text-secondary)", pointerEvents: "none" }}>
          {Math.round(active.share)} %
        </text>
      )}
    </svg>
  );
}

export function ChannelBreakdown({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const { theme } = useTheme();
  const prefersReduced = useReducedMotion();
  const rows = getChannelRows(data, t);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!rows.length) return null;

  const isFull = item.eligibility.variant === "full";
  const total = data.trafficOverview?.totalSessions.value ?? rows.reduce((s, r) => s + r.value, 0);
  // Dark mode takes its own validated steps, not a dimmed copy of the light ones.
  const segments: Segment[] = rows.map((r) => ({
    share: r.share,
    value: r.value,
    label: CHANNEL_INFO[r.channelKey]?.name ?? r.label,
    color: channelColorByKey(r.channelKey, theme),
  }));

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="surface-card p-5 sm:p-6"
    >
      <p className="eyebrow mb-4">{t.dashboard.channels.eyebrow}</p>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0 sm:pt-2">
          <DonutChart segments={segments} totalSessions={total} hoveredIndex={hoveredIndex} onHover={setHoveredIndex} reduced={!!prefersReduced} />
        </div>
        <ul className="flex w-full min-w-0 flex-1 flex-col gap-0.5">
          {rows.map((row, i) => {
            const color = segments[i].color;
            const pct = Math.round(row.share);
            const isActive = hoveredIndex === i;
            const isDimmed = hoveredIndex !== null && !isActive;
            const info = CHANNEL_INFO[row.channelKey];
            return (
              <li
                key={`${row.channelKey}-${row.label}`}
                className="flex cursor-default items-center gap-3 rounded-[10px] px-2.5 py-2"
                style={{
                  background: isActive ? `color-mix(in oklab, ${color} 9%, transparent)` : "transparent",
                  opacity: isDimmed ? 0.4 : 1,
                  transition: "background 0.18s ease, opacity 0.18s ease",
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <span className="shrink-0 self-stretch rounded-full" style={{ width: "3px", minHeight: "36px", background: color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate" style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.25 }}>
                      {info?.name ?? row.label}
                    </p>
                    {info?.info && <InfoTooltip text={info.info} />}
                  </div>
                  {info?.sub && (
                    <p className="truncate" style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.3, marginTop: "1px" }}>
                      {info.sub}
                    </p>
                  )}
                  <div className="mt-1.5 h-[3px] w-full rounded-full" style={{ background: "var(--line-soft)" }}>
                    <motion.div
                      initial={prefersReduced ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: prefersReduced ? 0 : 0.45, delay: prefersReduced ? 0 : 0.15 + i * 0.04, ease: EASE_OUT }}
                      style={{ height: "100%", width: `${row.share}%`, background: color, transformOrigin: "0 50%", borderRadius: "9999px" }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className="font-stat tabular-nums"
                    style={{ fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1 }}
                  >
                    {formatNumber(row.value, "number")}
                  </span>
                  <span className="flex items-center gap-2">
                    {isFull && row.metric && <DeltaText metric={row.metric} />}
                    <span className="tabular-nums" style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", minWidth: "32px", textAlign: "right" }}>
                      {pct} %
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.section>
  );
}
