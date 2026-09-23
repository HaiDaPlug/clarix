"use client";

import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AssembledDashboardItem } from "@/types/dashboard";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils/format";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

// Two series, two encodings: visits are the solid coral line with a fill;
// visitors, when GA4 provides them, a thin dashed ink line without one. The
// two warm gradients this replaced could not be told apart at a glance.
const VISITS_STROKE = "var(--brand-coral)";
const VISITORS_STROKE = "var(--text-secondary)";

type Point = { date: string; besök: number; besökare?: number };

export function SessionsChart({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const prefersReduced = useReducedMotion();
  const traffic = data.trafficOverview;
  if (!traffic?.timeSeries) return null;

  const isFull = item.eligibility.variant === "full";
  // Visitors are only drawn when the data actually carries them. The old
  // fallback estimated them as 72 % of visits, which put an invented line on
  // a chart the customer trusts.
  const hasVisitors = traffic.timeSeries.some((pt) => pt.secondaryValue !== undefined);
  const chartData: Point[] = traffic.timeSeries.map((pt) => ({
    date: pt.date.slice(5),
    besök: pt.value,
    ...(hasVisitors && pt.secondaryValue !== undefined ? { besökare: pt.secondaryValue } : {}),
  }));

  if (chartData.length === 0) {
    return (
      <motion.section
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="surface-card flex flex-col items-center justify-center gap-1.5 p-6"
        style={{ minHeight: "200px" }}
      >
        <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>Ingen data för denna period</p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
          GA4 har inte registrerat några sessioner ännu. Data dyker upp så fort besökare landar på sajten.
        </p>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="surface-card p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="eyebrow">{t.dashboard.sessions.eyebrow}</p>
            <InfoTooltip text={t.dashboard.sessions.eyebrowTooltip} side="below" />
          </div>
          {isFull && (
            <>
              <h3
                className="font-display"
                style={{ fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25, color: "var(--text-primary)", marginTop: "6px" }}
              >
                {t.registry.sessionsChart.narrative}
              </h3>
              <p className="tabular-nums" style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                {t.dashboard.sessions.totalSessions(formatNumber(traffic.totalSessions.value, "number"))}
              </p>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-4" aria-hidden>
          <span className="flex items-center gap-2" style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-secondary)" }}>
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: VISITS_STROKE }} />
            Besök
          </span>
          {hasVisitors && (
            <span className="flex items-center gap-2" style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-secondary)" }}>
              <span
                className="inline-block h-0 w-4"
                style={{ borderTop: `2px dashed ${VISITORS_STROKE}` }}
              />
              Besökare
            </span>
          )}
        </div>
      </div>

      <motion.div
        style={{ height: "220px" }}
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-sessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VISITS_STROKE} stopOpacity={0.18} />
                <stop offset="100%" stopColor={VISITS_STROKE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line-soft)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="var(--line)" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis stroke="var(--line)" tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatNumber(v, "number")} />
            <Tooltip
              contentStyle={{
                background: "var(--charcoal)",
                border: "none",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                color: "var(--parchment)",
                padding: "8px 12px",
                boxShadow: "var(--shadow-raised)",
              }}
              labelStyle={{ color: "var(--slate-light)", fontWeight: 400, marginBottom: 4 }}
              itemStyle={{ color: "var(--parchment)", padding: "1px 0" }}
              formatter={(value) => formatNumber(Number(value), "number")}
              cursor={{ stroke: "var(--line)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="besök"
              name="Besök"
              stroke={VISITS_STROKE}
              strokeWidth={2}
              fill="url(#grad-sessions)"
              dot={false}
              isAnimationActive={false}
            />
            {hasVisitors && (
              <Area
                type="monotone"
                dataKey="besökare"
                name="Besökare"
                stroke={VISITORS_STROKE}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.section>
  );
}
