"use client";

import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AssembledDashboardItem } from "@/types/dashboard";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils/format";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";

const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

function SessionsChartReveal({ chartData }: { chartData: { date: string; besök: number; besökare: number }[] }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      style={{ height: "220px" }}
      initial={prefersReduced ? false : { clipPath: "inset(0% 50% 0% 50%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={prefersReduced ? { duration: 0 } : { duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-sessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.62 0.22 295)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.62 0.22 295)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-users" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.62 0.22 155)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="oklch(0.62 0.22 155)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="var(--slate)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--slate)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--charcoal)", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "var(--bone)", padding: "8px 12px" }}
            labelStyle={{ color: "var(--slate-light)", fontWeight: 400, marginBottom: 4 }}
            itemStyle={{ color: "var(--bone)", padding: "1px 0" }}
            cursor={{ stroke: "var(--rule)", strokeWidth: 1 }}
          />
          <Area type="monotone" dataKey="besök" stroke="oklch(0.62 0.22 295)" strokeWidth={2.5} fill="url(#grad-sessions)" dot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="besökare" stroke="oklch(0.62 0.22 155)" strokeWidth={2.5} fill="url(#grad-users)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function SessionsChart({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const traffic = data.trafficOverview;
  if (!traffic?.timeSeries) return null;

  const isFull = item.eligibility.variant === "full";
  const chartData = traffic.timeSeries.map((pt) => ({
    date: pt.date.slice(5),
    besök: pt.value,
    besökare: pt.secondaryValue ?? Math.round(pt.value * 0.72),
  }));

  if (chartData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.2 }}
        className="rounded-2xl p-6 flex flex-col items-center justify-center gap-2"
        style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)", minHeight: "200px" }}
      >
        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--charcoal)" }}>Ingen data för denna period</p>
        <p style={{ fontSize: "13px", color: "var(--slate)" }}>
          GA4 har inte registrerat några sessioner ännu. Data dyker upp så fort besökare landar på sajten.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="eyebrow" style={{ color: "var(--slate)" }}>{t.dashboard.sessions.eyebrow}</p>
            <InfoTooltip text={t.dashboard.sessions.eyebrowTooltip} side="below" />
          </div>
          {isFull && (
            <>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em", color: "var(--charcoal)" }}>
                {t.registry.sessionsChart.narrative}
              </p>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--slate)", marginTop: "6px" }}>
                {t.dashboard.sessions.totalSessions(formatNumber(traffic.totalSessions.value, "number"))}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-5 shrink-0 ml-6">
          <span className="flex items-center gap-2" style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)" }}>
            <span className="w-4 h-0.5 inline-block rounded-full" style={{ background: "oklch(0.62 0.22 295)" }} />
            Besök
          </span>
          <span className="flex items-center gap-2" style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)" }}>
            <span className="w-4 h-0.5 inline-block rounded-full" style={{ background: "oklch(0.62 0.22 155)" }} />
            Besökare
          </span>
        </div>
      </div>
      <SessionsChartReveal chartData={chartData} />
    </motion.div>
  );
}
