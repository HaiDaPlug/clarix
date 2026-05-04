"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  localizeMockReportData,
  scenario1,
  scenario2,
  scenario3,
} from "@/lib/mock-data";
import { assembleDashboard } from "@/lib/dashboard/assemble";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { ArrowDownRight, ArrowUpRight, Calendar, Download } from "lucide-react";
import { formatChange, formatNumber } from "@/lib/utils/format";
import { getNestedField } from "@/lib/utils/field-check";
import {
  AssembledDashboardItem,
  DashboardItemId,
} from "@/types/dashboard";
import { Metric, ReportData } from "@/types/schema";
import { useLocale, Translations } from "@/lib/i18n";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import {
  ConnectableSource,
  ConnectedSource,
  currentCalendarMonthRange,
  mergeReportData,
} from "@/lib/google/connected-sources";
import { createClient } from "@/utils/supabase/client";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import { useDevScenario } from "@/lib/dev-scenario";

const SCENARIOS = [
  { id: "scenario-1", labelKey: "seoTraffic", data: scenario1 },
  { id: "scenario-2", labelKey: "full", data: scenario2 },
  { id: "scenario-3", labelKey: "partial", data: scenario3 },
] as const;

const EASING = [0.25, 0.1, 0.25, 1] as const;
const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

const HERO_ENTER  = { duration: 0.5, ease: EASE_OUT, delay: 0 };
const CARD_ENTER  = (i: number) => ({ duration: 0.45, ease: EASE_OUT, delay: 0.06 + i * 0.05 });

function getMetric(data: ReportData, path?: string): Metric | undefined {
  if (!path) return undefined;
  return getNestedField(data, path) as Metric | undefined;
}

function getKpiLabel(itemId: DashboardItemId, metric: Metric | undefined, t: Translations): string {
  if (itemId === "engagement-kpi") return t.dashboard.kpi.engagement;
  if (itemId === "paid-efficiency-kpi") return t.dashboard.kpi.paidEfficiency;
  if (itemId === "conversions-kpi") return t.dashboard.kpi.conversions;
  return metric?.label ?? "";
}

function getRegistryHeadline(itemId: DashboardItemId, metric: Metric, data: ReportData, t: Translations): string | undefined {
  const r = t.registry;
  switch (itemId) {
    case "traffic-kpi":
      return data.trafficOverview?.totalSessions.trend === "down" ? r.traffic.headlineDown : r.traffic.headlineUp;
    case "organic-reach-kpi":
      return metric.trend === "down" ? r.organic.headlineDown : r.organic.headlineUp;
    case "search-clicks-kpi":
      return metric.trend === "down" ? r.searchClicks.headlineDown : r.searchClicks.headlineUp;
    case "engagement-kpi":
      return metric.trend === "down" ? r.engagement.headlineDown : r.engagement.headlineUp;
    case "conversions-kpi":
      return metric.trend === "down" ? r.conversions.headlineDown : r.conversions.headlineUp;
    case "paid-efficiency-kpi":
      return r.paidEfficiency.headline;
    default:
      return undefined;
  }
}

function getRegistryInsight(itemId: DashboardItemId, metric: Metric, data: ReportData, t: Translations): string | undefined {
  const r = t.registry;
  switch (itemId) {
    case "traffic-kpi":
      return data.trafficOverview?.paidSessions ? r.traffic.insightPaid : r.traffic.insightOrganic;
    case "organic-reach-kpi":
      return r.organic.insight;
    case "search-clicks-kpi":
      return r.searchClicks.insight;
    case "engagement-kpi":
      return metric.trend === "down" ? r.engagement.insightDown : r.engagement.insightUp;
    case "conversions-kpi":
      return r.conversions.insight;
    case "paid-efficiency-kpi":
      return r.paidEfficiency.insight;
    default:
      return undefined;
  }
}

function getChangeState(metric: Metric, itemId?: DashboardItemId) {
  if (metric.previousValue === undefined) return null;

  const change = formatChange(metric.value, metric.previousValue);
  const upIsGood = itemId === "engagement-kpi" ? false : metric.trendGood !== false;
  const isGood =
    change.direction === "flat"
      ? null
      : (change.direction === "up" && upIsGood) ||
        (change.direction === "down" && !upIsGood);

  return { change, isGood };
}

function ChangeChip({
  metric,
  itemId,
  t,
}: {
  metric: Metric;
  itemId?: DashboardItemId;
  t: Translations;
}) {
  const state = getChangeState(metric, itemId);
  if (!state || state.change.direction === "flat") return null;

  return (
    <span
      className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full"
      style={{
        backgroundColor: state.isGood ? "var(--signal-up-bg)" : "var(--signal-down-bg)",
        color: state.isGood ? "var(--signal-up)" : "var(--signal-down)",
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
      <span aria-hidden>{state.change.direction === "up" ? "\u2191" : "\u2193"}</span>
      {state.change.value} {t.dashboard.kpi.vsPrior}
    </span>
  );
}

function DeltaText({ metric, itemId }: { metric: Metric; itemId?: DashboardItemId }) {
  const state = getChangeState(metric, itemId);
  if (!state || state.change.direction === "flat") return null;

  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        color: state.isGood ? "var(--signal-up)" : "var(--signal-down)",
      }}
    >
      {state.change.direction === "up" ? "\u2191" : "\u2193"}
      {state.change.value}
    </span>
  );
}

function MetricTile({ metric, itemId }: { metric: Metric; itemId?: DashboardItemId }) {
  return (
    <div>
      <p className="eyebrow mb-1.5" style={{ color: "var(--slate)" }}>
        {metric.label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.6rem",
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "var(--charcoal)",
        }}
      >
        {formatNumber(metric.value, metric.unit)}
      </p>
      <div className="mt-1">
        <DeltaText metric={metric} itemId={itemId} />
      </div>
    </div>
  );
}

function colorizeNumbers(text: string): React.ReactNode {
  const parts = text.split(/([-+]?\d[\d\s.,]*\s*(?:%|kr|SEK|k|K|mn)?)/g);
  return parts.map((part, i) => {
    if (!/\d/.test(part)) return part;
    const isNegative = part.trimStart().startsWith("-");
    return (
      <span
        key={i}
        style={{
          color: isNegative ? "#B91C1C" : "#16a34a",
          fontWeight: 800,
        }}
      >
        {part}
      </span>
    );
  });
}

function DashboardHero({
  item,
  data,
}: {
  item: AssembledDashboardItem;
  data: ReportData;
}) {
  const { t } = useLocale();
  const summary = data.executiveSummary;
  if (!summary) return null;

  const isFull = item.eligibility.variant === "full";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={HERO_ENTER}
      className="relative overflow-hidden rounded-3xl border p-8 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)] sm:p-10"
      style={{
        background: "linear-gradient(135deg, oklch(0.97 0.04 300) 0%, oklch(0.96 0.05 260) 45%, oklch(0.97 0.04 350) 100%)",
        borderColor: "rgba(139,92,246,0.25)",
      }}
    >
      {/* glows */}
      <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5), transparent 70%)" }} />
      <div className="pointer-events-none absolute right-1/3 top-10 h-40 w-40 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.88 0.12 350 / 0.5), transparent 70%)" }} />

      <div className="relative flex flex-col">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "oklch(0.45 0.18 290)" }}>
            Insikter från proffset
          </p>
          <span className="text-[11px]" style={{ color: "oklch(0.45 0.18 290)" }}>—</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "oklch(0.45 0.18 290)" }}>
            {data.meta.period.label}
          </span>
        </div>

        <p className="mt-5 text-[2rem] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[2.4rem]" style={{ color: "oklch(0.14 0.02 280)" }}>
          <span className="relative inline">
            {colorizeNumbers(summary.headline)}
            <svg
              viewBox="0 0 300 10"
              preserveAspectRatio="none"
              aria-hidden
              className="absolute left-0 right-0"
              style={{ bottom: "-10px", height: "10px", width: "100%" }}
            >
              <path
                d="M0,6 C20,1 40,9 60,5 C80,1 100,9 120,5 C140,1 160,9 180,5 C200,1 220,9 240,5 C260,1 280,9 300,5"
                fill="none"
                stroke="oklch(0.62 0.22 295)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </p>

        {isFull && summary.subheadline && (
          <p className="mt-6 text-lg font-normal leading-relaxed" style={{ color: "oklch(0.38 0.06 280)" }}>
            {colorizeNumbers(summary.subheadline)}
          </p>
        )}

        <div className="mt-7">
          <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-white"
            style={{ color: "oklch(0.35 0.15 290)", textDecoration: "none" }}
          >
            {t.dashboard.hero.readReport}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

const SPARK_BLUE = "oklch(0.55 0.2 250)";

function getSparkData(itemId: DashboardItemId, data: ReportData): { i: number; v: number }[] {
  const series =
    itemId === "search-clicks-kpi"
      ? data.seoOverview?.timeSeries
      : itemId === "paid-efficiency-kpi"
        ? data.paidOverview?.timeSeries
        : data.trafficOverview?.timeSeries;
  if (!series?.length) return [];
  return series.map((pt, i) => ({ i, v: pt.value }));
}

/* ─── SparklineReveal: grows from center using CSS inset clip-path ─── */
function SparklineReveal({
  accent,
  sparkId,
  sparkData,
  delay,
}: {
  accent: string;
  sparkId: string;
  sparkData: { i: number; v: number }[];
  delay: number;
}) {
  const prefersReduced = useReducedMotion();
  const gradId = `grad-${sparkId}`;

  return (
    <motion.div
      style={{ width: "100%", height: "100%" }}
      initial={prefersReduced ? false : { clipPath: "inset(0% 50% 0% 50%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={prefersReduced ? { duration: 0 } : { duration: 1.2, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={accent} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={accent}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

/* ─── NumberFlash: scale-in pulse on mount ─── */
function NumberFlash({ children, delay }: { children: React.ReactNode; delay: number }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.span
      initial={prefersReduced ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.4, delay, ease: [0.0, 0.0, 0.2, 1] }}
      style={{ display: "inline-block" }}
    >
      {children}
    </motion.span>
  );
}

function KpiCard({
  item,
  data,
  index,
}: {
  item: AssembledDashboardItem;
  data: ReportData;
  index: number;
}) {
  const { t } = useLocale();
  const metric = getMetric(data, item.definition.metricPath);
  if (!metric) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CARD_ENTER(index)}
        className="relative overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-1.5"
        style={{
          background: "var(--bone)",
          border: "1px solid var(--rule)",
          minHeight: "180px",
          opacity: 0.5,
        }}
      >
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--charcoal)" }}>
          {getKpiLabel(item.itemId, undefined, t)}
        </p>
        <p style={{ fontSize: "12px", color: "var(--slate)" }}>Ingen data tillgänglig</p>
      </motion.div>
    );
  }

  const isFull = item.eligibility.variant === "full";
  const secondaryMetric = item.definition.secondaryMetricPaths
    ?.map((path) => getMetric(data, path))
    .find((candidate): candidate is Metric => Boolean(candidate));

  const headline = getRegistryHeadline(item.itemId, metric, data, t);
  const insight = getRegistryInsight(item.itemId, metric, data, t);

  const state = getChangeState(metric, item.itemId);
  const sparkData = getSparkData(item.itemId, data);
  const sparkId = `spark-kpi-${item.itemId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={CARD_ENTER(index)}
      className="relative overflow-hidden rounded-2xl flex flex-col"
      style={{
        background: "var(--bone)",
        border: "1px solid var(--rule)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.06)",
      }}
    >
      {/* top section */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">

        {/* label row */}
        <p className="eyebrow" style={{ color: "var(--slate)", letterSpacing: "0.1em" }}>
          {getKpiLabel(item.itemId, metric, t)}
        </p>

        {/* number + secondary metric */}
        <div className="flex items-baseline gap-3">
          <NumberFlash delay={0.1 + index * 0.05}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.4rem",
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "var(--charcoal)",
              }}
            >
              <AnimatedCounter value={metric.value} format={(n) => formatNumber(n, metric.unit)} />
            </span>
          </NumberFlash>
          {isFull && secondaryMetric && (
            <span style={{ fontSize: "12px", color: "var(--slate)" }}>
              {secondaryMetric.label}:{" "}
              <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>
                {formatNumber(secondaryMetric.value, secondaryMetric.unit)}
              </span>
            </span>
          )}
        </div>

        {/* pill */}
        {state && state.change.direction !== "flat" && (
          <div
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 self-start"
            style={{
              background: state.change.direction === "up"
                ? "oklch(0.92 0.1 145)"
                : "oklch(0.92 0.08 20)",
              color: state.change.direction === "up"
                ? "oklch(0.35 0.18 145)"
                : "oklch(0.4 0.2 20)",
            }}
          >
            {state.change.direction === "up"
              ? <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
              : <ArrowDownRight className="h-4 w-4" strokeWidth={2.5} />
            }
            <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "-0.01em" }}>
              {state.change.value}
            </span>
          </div>
        )}

        {/* educational text */}
        {isFull && (headline || insight) && (
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "12px", marginTop: "4px" }}>
            {headline && (
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--charcoal)", lineHeight: 1.4, marginBottom: "3px" }}>
                {headline}
              </p>
            )}
            {insight && (
              <p style={{ fontSize: "12px", color: "var(--slate)", lineHeight: 1.55 }}>
                {insight}
              </p>
            )}
          </div>
        )}
      </div>

      {/* sparkline strip — flush to bottom edge, grows from center */}
      <div className="h-12 w-full overflow-hidden" style={{ marginTop: "auto" }}>
        {sparkData.length > 1 && (
          <SparklineReveal accent={SPARK_BLUE} sparkId={sparkId} sparkData={sparkData} delay={0.18 + index * 0.06} />
        )}
      </div>
    </motion.div>
  );
}

type Effort = "låg" | "medel" | "hög";
type Reward = "låg" | "medel" | "hög";

interface NextStep {
  action: string;
  rationale: string;
  effort: Effort;
  reward: Reward;
}

const EFFORT_COLOR: Record<Effort, string> = {
  låg:   "oklch(0.62 0.22 155)",
  medel: "oklch(0.65 0.18 65)",
  hög:   "oklch(0.55 0.22 25)",
};

const REWARD_COLOR: Record<Reward, string> = {
  låg:   "oklch(0.55 0.08 250)",
  medel: "oklch(0.62 0.22 155)",
  hög:   "oklch(0.52 0.22 295)",
};

function deriveNextSteps(data: ReportData): NextStep[] {
  const steps: NextStep[] = [];
  const traffic = data.trafficOverview;
  const seo = data.seoOverview;
  const paid = data.paidOverview;

  if (paid?.totalSpend && paid.roas) {
    steps.push({
      action: "Skala upp de bäst presterande annonserna",
      rationale: `ROAS är ${formatNumber(paid.roas.value, "number")}× — kampanjerna är lönsamma och har utrymme att växa.`,
      effort: "låg",
      reward: "hög",
    });
  }

  if (seo && seo.avgPosition.value > 8) {
    steps.push({
      action: "Optimera de sidor som rankar på position 8–15",
      rationale: "Sidorna syns men klickas sällan. Bättre titlar och meta-texter kan ge snabb CTR-ökning.",
      effort: "medel",
      reward: "hög",
    });
  } else if (traffic?.organicSessions && traffic.organicSessions.trend === "down") {
    steps.push({
      action: "Granska innehållet på de tio viktigaste organiska sidorna",
      rationale: "Organisk trafik tappade. Uppdaterat innehåll brukar återhämta positioner inom 4–6 veckor.",
      effort: "medel",
      reward: "medel",
    });
  }

  if (traffic?.bounceRate && traffic.bounceRate.value > 50) {
    steps.push({
      action: "Förbättra landningssidans relevans och laddningstid",
      rationale: `Avvisningsfrekvensen är ${formatNumber(traffic.bounceRate.value, "percent")} — besökarna lämnar utan att agera.`,
      effort: "medel",
      reward: "hög",
    });
  } else if (!paid) {
    steps.push({
      action: "Testa Google Ads med en liten budget",
      rationale: "Ni har stark organik men saknar betald trafik. Även 3 000 kr/mån ger värdefull data.",
      effort: "låg",
      reward: "medel",
    });
  }

  return steps.slice(0, 3);
}

function NextStepsCard({ data }: { data: ReportData }) {
  const steps = deriveNextSteps(data);
  if (!steps.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1], delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      {/* header */}
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="eyebrow mb-1" style={{ color: "var(--slate)" }}>Prioriterat</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em", color: "var(--charcoal)" }}>
            Nästa steg
          </p>
        </div>
        <div className="flex items-center gap-4" style={{ fontSize: "11px", color: "var(--slate)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: EFFORT_COLOR["låg"] }} />
            Effort
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: REWARD_COLOR["hög"] }} />
            Vinst
          </span>
        </div>
      </div>

      {/* steps */}
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 + i * 0.06, ease: [0.0, 0.0, 0.2, 1] }}
            className="flex items-start gap-4 rounded-xl px-4 py-3.5"
            style={{ background: "color-mix(in oklch, var(--bone) 60%, white)", border: "1px solid var(--rule)" }}
          >
            {/* step number */}
            <span
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full mt-0.5"
              style={{
                background: "var(--charcoal)",
                color: "var(--bone)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {i + 1}
            </span>

            {/* text */}
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--charcoal)", lineHeight: 1.35, marginBottom: "3px" }}>
                {step.action}
              </p>
              <p style={{ fontSize: "12.5px", color: "var(--slate)", lineHeight: 1.5 }}>
                {step.rationale}
              </p>
            </div>

            {/* effort / reward badges */}
            <div className="shrink-0 flex flex-col items-end gap-1.5 mt-0.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: `color-mix(in oklch, ${EFFORT_COLOR[step.effort]} 12%, transparent)`,
                  color: EFFORT_COLOR[step.effort],
                }}
              >
                Effort: {step.effort}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: `color-mix(in oklch, ${REWARD_COLOR[step.reward]} 12%, transparent)`,
                  color: REWARD_COLOR[step.reward],
                }}
              >
                Vinst: {step.reward}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── SessionsChartReveal: grows from center using CSS inset clip-path ─── */
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
            contentStyle={{
              background: "var(--charcoal)",
              border: "none",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--bone)",
              padding: "8px 12px",
            }}
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

function SessionsChart({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
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
        transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1], delay: 0.2 }}
        className="rounded-2xl p-6 flex flex-col items-center justify-center gap-2"
        style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)", minHeight: "200px" }}
      >
        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--charcoal)" }}>
          Ingen data för denna period
        </p>
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
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1], delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-1.5" style={{ color: "var(--slate)" }}>
            {t.dashboard.sessions.eyebrow}
            <InfoTooltip text={t.dashboard.sessions.eyebrowTooltip} />
          </p>
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

function getChannelRows(data: ReportData, t: Translations) {
  const traffic = data.trafficOverview;
  if (!traffic) return [];

  const metricByChannel: Record<string, Metric | undefined> = {
    "Organic Search": traffic.organicSessions,
    "Organisk sökning": traffic.organicSessions,
    Organic: traffic.organicSessions,
    "Paid Search": traffic.paidSessions,
    "Betald sökning": traffic.paidSessions,
    Paid: traffic.paidSessions,
    Direct: traffic.directSessions,
    Direkt: traffic.directSessions,
    Referral: traffic.referralSessions,
    Hänvisningar: traffic.referralSessions,
  };

  if (traffic.channelBreakdown?.length) {
    return traffic.channelBreakdown.map((channel) => {
      const metric = metricByChannel[channel.channel];
      return {
        label: channel.channel,
        value: channel.sessions,
        share: channel.share,
        metric,
      };
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
      share: traffic.totalSessions.value
        ? Math.round((row.metric.value / traffic.totalSessions.value) * 100)
        : 0,
      metric: row.metric,
    }));
}

const CHANNEL_COLORS = [
  { stroke: "#E8524A", bg: "rgba(232,82,74,0.10)", label: "#C0392B" },   // coral — Organic
  { stroke: "#8B5CF6", bg: "rgba(139,92,246,0.10)", label: "#7C3AED" },   // violet — Paid
  { stroke: "#F5A623", bg: "rgba(245,166,35,0.10)", label: "#D4870F" },   // amber — Direct
  { stroke: "#2D6A4F", bg: "rgba(45,106,79,0.10)",  label: "#1E4D39" },   // forest — Referral
  { stroke: "#0EA5E9", bg: "rgba(14,165,233,0.10)", label: "#0369A1" },   // sky — Social
  { stroke: "#6B6760", bg: "rgba(107,103,96,0.10)", label: "#4A4540" },   // slate — Other
];

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
  const R = 84;
  const CX = 110;
  const CY = 110;
  const strokeW = 22;
  const gapDeg = 2.8;
  const circumference = 2 * Math.PI * R;

  // Build arc descriptors
  type Arc = { color: string; dashArray: string; dashOffset: string; rotation: number; index: number };
  const arcs: Arc[] = [];
  let cursor = -90; // start at 12 o'clock

  segments.forEach((seg, i) => {
    const deg = (seg.share / 100) * 360;
    const usableDeg = Math.max(0, deg - gapDeg);
    const usableFrac = usableDeg / 360;
    const dashLen = usableFrac * circumference;
    const rotation = cursor;
    arcs.push({
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length].stroke,
      dashArray: `${dashLen} ${circumference - dashLen}`,
      dashOffset: `${circumference * 0.25}`,
      rotation,
      index: i,
    });
    cursor += deg;
  });

  const active = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <svg
      viewBox="0 0 220 220"
      width="220"
      height="220"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* track ring */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="var(--rule)"
        strokeWidth={strokeW}
      />

      {arcs.map((arc) => {
        const isHovered = hoveredIndex === arc.index;
        const isDimmed = hoveredIndex !== null && !isHovered;
        // dashLen is the actual drawn portion; gapLen fills the rest of the circle.
        // To animate draw-in: start dashOffset = dashLen (fully hidden), end at 0 (fully shown).
        // The quarter-turn offset (dashOffset = circumference * 0.25) is baked into the
        // rotate transform instead, so dashOffset here is purely for the draw-in.
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

      {/* center label */}
      <text
        x={CX} y={CY - 12}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "9px",
          fontWeight: 500,
          fill: "var(--slate)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        {active ? active.label.toUpperCase().slice(0, 10) : "TOTALT"}
      </text>
      <text
        x={CX} y={CY + 18}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: active ? "26px" : "30px",
          fontWeight: 700,
          fill: "var(--charcoal)",
          letterSpacing: "-0.03em",
          pointerEvents: "none",
        }}
      >
        {active
          ? formatNumber(active.value, "number")
          : totalSessions >= 1000
            ? `${(totalSessions / 1000).toFixed(1)}k`
            : String(totalSessions)}
      </text>
      {active && (
        <text
          x={CX} y={CY + 34}
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "12px",
            fontWeight: 600,
            fill: CHANNEL_COLORS.find((_, ci) => segments[ci]?.label === active.label)?.stroke ?? "var(--slate)",
            pointerEvents: "none",
          }}
        >
          {Math.round(active.share)}%
        </text>
      )}
    </svg>
  );
}

function ChannelBreakdown({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const rows = getChannelRows(data, t);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!rows.length) return null;

  const isFull = item.eligibility.variant === "full";
  const total = data.trafficOverview?.totalSessions.value ?? rows.reduce((s, r) => s + r.value, 0);

  const segments = rows.map((r) => ({ ...r, share: r.share }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1], delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      {/* header */}
      <p className="eyebrow mb-4" style={{ color: "var(--slate)" }}>
        {t.dashboard.channels.eyebrow}
      </p>

      {/* chart + legend layout */}
      <div className="flex items-center gap-5">
        {/* donut */}
        <div className="shrink-0">
          <DonutChart
            segments={segments}
            totalSessions={total}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
        </div>

        {/* legend */}
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
                {/* color swatch */}
                <span
                  className="shrink-0 rounded-sm"
                  style={{
                    width: "3px",
                    height: "24px",
                    background: color.stroke,
                    opacity: isDimmed ? 0.5 : 1,
                    borderRadius: "2px",
                  }}
                />

                {/* name + sessions + share bar stacked */}
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate"
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--slate)",
                      lineHeight: 1.2,
                    }}
                  >
                    {row.label}
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.35rem",
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        color: isActive ? color.label : "var(--charcoal)",
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                        transition: "color 0.18s ease",
                      }}
                    >
                      {formatNumber(row.value, "number")}
                    </span>
                    {isFull && row.metric && <DeltaText metric={row.metric} />}
                  </div>
                  {/* share bar — grows from center outward */}
                  <div
                    className="mt-1.5 h-0.5 w-full rounded-full"
                    style={{ background: "var(--rule)", position: "relative" }}
                  >
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        height: "100%",
                        width: `${row.share}%`,
                        background: color.stroke,
                        transformOrigin: "50% 50%",
                        borderRadius: "9999px",
                      }}
                    />
                  </div>
                </div>

                {/* pct pill */}
                <span
                  className="shrink-0 rounded-full px-2 py-1"
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    background: isActive ? color.stroke : "var(--rule)",
                    color: isActive ? "white" : "var(--slate)",
                    transition: "background 0.18s ease, color 0.18s ease",
                    minWidth: "36px",
                    textAlign: "center",
                  }}
                >
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

function SearchVisibility({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const seo = data.seoOverview;
  if (!seo) return null;

  const isFull = item.eligibility.variant === "full";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1], delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <p className="eyebrow mb-1" style={{ color: "var(--slate)" }}>
        {t.dashboard.search.eyebrow}
      </p>
      {isFull && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--charcoal)",
            marginBottom: "20px",
            letterSpacing: "-0.025em",
          }}
        >
          {t.registry.searchVisibility.narrative}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-6" style={{ marginTop: isFull ? 0 : "16px" }}>
        {[seo.totalClicks, seo.totalImpressions, seo.avgCtr, seo.avgPosition].map((metric) => (
          <MetricTile key={metric.label} metric={metric} />
        ))}
      </div>
    </motion.div>
  );
}

function PaidPerformance({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const paid = data.paidOverview;
  if (!paid) return null;

  const isFull = item.eligibility.variant === "full";
  const metrics = isFull
    ? [
        paid.totalSpend,
        paid.totalClicks,
        paid.avgCpc,
        paid.roas,
        paid.conversions,
      ].filter((metric): metric is Metric => Boolean(metric))
    : [paid.totalSpend, paid.totalClicks];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1], delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <p className="eyebrow mb-1" style={{ color: "var(--slate)" }}>
        {t.dashboard.paid.eyebrow}
      </p>
      {isFull && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--charcoal)",
            marginBottom: "20px",
            letterSpacing: "-0.025em",
          }}
        >
          {t.registry.paidPerformance.narrative}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-6" style={{ marginTop: isFull ? 0 : "16px" }}>
        {metrics.map((metric) => (
          <MetricTile key={metric.label} metric={metric} />
        ))}
      </div>
    </motion.div>
  );
}

function SectionItem({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  if (item.itemId === "channel-breakdown") return <ChannelBreakdown item={item} data={data} />;
  if (item.itemId === "search-visibility") return <SearchVisibility item={item} data={data} />;
  if (item.itemId === "paid-performance") return <PaidPerformance item={item} data={data} />;
  return null;
}

export default function DashboardPage() {
  const { locale, t } = useLocale();
  const { activeId } = useDevScenario();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [hasConnectedSources, setHasConnectedSources] = useState(false);
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [expiredSources, setExpiredSources] = useState<string[]>([]);
  const active = useMemo(() => SCENARIOS.find((scenario) => scenario.id === activeId)!, [activeId]);
  const fallbackData = useMemo(
    () => localizeMockReportData(active.data, locale),
    [active.data, locale]
  );
  const activeData = reportData ?? fallbackData;
  const dashboard = useMemo(() => assembleDashboard(activeData, t), [activeData, t]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadRealData() {
      setIsLoadingRealData(true);
      setDataError(null);
      setReportData(fallbackData);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"])
        .neq("property_id", "_pending");

      if (signal.aborted) return;

      if (error) {
        setHasConnectedSources(false);
        setDataError("Could not load connected data sources.");
        setIsLoadingRealData(false);
        return;
      }

      const sources = (data ?? []).filter(
        (source): source is ConnectedSource =>
          source.source === "ga4" || source.source === "gsc",
      );
      setHasConnectedSources(sources.length > 0);

      if (sources.length === 0) {
        setReportData(fallbackData);
        setIsLoadingRealData(false);
        return;
      }

      const dateRange = currentCalendarMonthRange();
      const expired: string[] = [];
      const successfulSourceIds: ConnectableSource[] = [];
      const parts = await Promise.all(
        sources.map(async (source) => {
          try {
            const endpoint = source.source === "ga4" ? "/api/ga4" : "/api/gsc";
            const body =
              source.source === "ga4"
                ? { propertyId: source.property_id, dateRange, locale }
                : { siteUrl: source.property_id, dateRange, locale };
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              signal,
            });

            if (response.status === 401 || response.status === 403) {
              expired.push(source.source === "ga4" ? "Google Analytics" : "Search Console");
              return undefined;
            }
            if (!response.ok) {
              console.error(`[dashboard] ${source.source} returned ${response.status}`, await response.json().catch(() => null));
              return undefined;
            }
            const data = (await response.json()) as Partial<ReportData>;
            console.log(`[dashboard] ${source.source} data:`, JSON.stringify(data).slice(0, 500));
            successfulSourceIds.push(source.source);
            return data;
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return undefined;
            return undefined;
          }
        }),
      );

      if (signal.aborted) return;

      setExpiredSources(expired);
      const merged = mergeReportData(
        fallbackData,
        parts,
        successfulSourceIds,
      );
      if (!merged.executiveSummary) {
        merged.executiveSummary = deriveExecutiveSummary(merged, locale);
      }
      setReportData(merged);
      setIsLoadingRealData(false);
    }

    loadRealData();

    return () => {
      controller.abort();
    };
  }, [fallbackData, locale]);

  const heroItem = dashboard.items.find((item) => item.definition.type === "hero");
  const kpiItems = dashboard.items.filter((item) => item.definition.type === "kpi");
  const chartItems = dashboard.items.filter((item) => item.definition.type === "chart");
  const sectionItems = dashboard.items.filter((item) => item.definition.type === "section");

  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      <header
        className="flex items-center justify-between px-8 border-b shrink-0 sticky top-0 z-30"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)", height: "88px" }}
      >
        <div>
          <p className="eyebrow" style={{ color: "var(--slate)" }}>
            {activeData.meta.period.label}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "var(--charcoal)",
              letterSpacing: "-0.02em",
              marginTop: "2px",
            }}
          >
            {t.dashboard.heading}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)]"
            style={{ border: "1px solid var(--rule)", color: "var(--charcoal)", backgroundColor: "var(--bone)" }}
          >
            <Calendar className="h-4 w-4" style={{ color: "var(--slate)" }} />
            Senaste 30 dagarna
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            <Download className="h-4 w-4" />
            Exportera
          </button>
        </div>
      </header>

      <main className="flex-1 px-8 py-8 flex flex-col gap-7">

        {expiredSources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--signal-down-bg)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--signal-down)" }} />
              <p style={{ fontSize: "13px", color: "var(--slate)" }}>
                <span style={{ color: "var(--charcoal)", fontWeight: 500 }}>
                  {expiredSources.join(" and ")} connection expired.
                </span>{" "}
                Reconnect to see your latest data.
              </p>
            </div>
            <Link
              href="/integrations"
              className="shrink-0 ml-6"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--charcoal)",
                textDecoration: "none",
              }}
            >
              Reconnect
            </Link>
          </motion.div>
        )}

        {(!hasConnectedSources || isLoadingRealData || dataError) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#C97B2A" }} />
              <p style={{ fontSize: "13px", color: "var(--slate)" }}>
                {dataError ??
                  (isLoadingRealData
                    ? "Loading connected source data..."
                    : t.dashboard.sampleBanner.text)}{" "}
                {!hasConnectedSources && (
                  <>
                    <span style={{ color: "var(--charcoal)", fontWeight: 500 }}>
                      {t.dashboard.sampleBanner.cta}
                    </span>{" "}
                    {t.dashboard.sampleBanner.suffix}
                  </>
                )}
              </p>
            </div>
            <Link
              href="/integrations"
              className="shrink-0 ml-6"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--charcoal)",
                textDecoration: "none",
              }}
            >
              {t.dashboard.sampleBanner.link}
            </Link>
          </motion.div>
        )}

        {heroItem && <DashboardHero item={heroItem} data={activeData} />}

        {kpiItems.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {kpiItems.map((item, index) => (
              <KpiCard key={item.itemId} item={item} data={activeData} index={index} />
            ))}
          </div>
        )}

        {chartItems.map((item) => (
          <SessionsChart key={item.itemId} item={item} data={activeData} />
        ))}

        {sectionItems.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {sectionItems.map((item) => (
              <SectionItem key={item.itemId} item={item} data={activeData} />
            ))}
            <NextStepsCard data={activeData} />
          </div>
        )}

        {dashboard.nudge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASING }}
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <p style={{ fontSize: "13px", color: "var(--slate)" }}>
              {dashboard.nudge.message}
            </p>
            <Link
              href="/integrations"
              className="shrink-0 ml-6"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--charcoal)",
                textDecoration: "none",
              }}
            >
              {t.dashboard.nudge.link}
            </Link>
          </motion.div>
        )}
      </main>

    </div>
  );
}
