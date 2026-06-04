"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { ShimmerOverlay } from "@/components/primitives/ShimmerCard";
import { formatNumber } from "@/lib/utils/format";
import { AssembledDashboardItem, DashboardItemId } from "@/types/dashboard";
import { Metric, ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import {
  GoogleAnalyticsLogo,
  GoogleSearchConsoleLogo,
  GoogleAdsLogo,
} from "@/components/landing/brand-logos";
import {
  getMetric,
  getChangeState,
  getKpiLabel,
  getRegistryHeadline,
  getRegistryInsight,
} from "@/components/dashboard/metrics";

type SourceLogoComponent = (props: { className?: string }) => React.ReactElement;

const KPI_SOURCE_LOGO: Partial<Record<DashboardItemId, SourceLogoComponent>> = {
  "traffic-kpi":        GoogleAnalyticsLogo,
  "organic-reach-kpi":  GoogleAnalyticsLogo,
  "engagement-kpi":     GoogleAnalyticsLogo,
  "conversions-kpi":    GoogleAnalyticsLogo,
  "search-clicks-kpi":  GoogleSearchConsoleLogo,
  "paid-efficiency-kpi": GoogleAdsLogo,
};

const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;
const CARD_ENTER = (i: number) => ({ duration: 0.45, ease: EASE_OUT, delay: 0.06 + i * 0.05 });
const SPARK_COLOR = "#FF6B55";

function getSparkData(itemId: DashboardItemId, data: ReportData): { i: number; v: number }[] {
  let series: NonNullable<ReportData["trafficOverview"]>["timeSeries"] | undefined;
  switch (itemId) {
    case "search-clicks-kpi":
      series = data.seoOverview?.timeSeries;
      break;
    case "paid-efficiency-kpi":
      series = data.paidOverview?.timeSeries;
      break;
    case "conversions-kpi":
      series = data.conversions?.timeSeries ?? data.trafficOverview?.timeSeries;
      break;
    case "engagement-kpi":
      series = data.trafficOverview?.timeSeries?.map((pt, i) => ({
        ...pt,
        value: pt.value > 0 ? 100 - pt.value : pt.value,
      }));
      break;
    case "organic-reach-kpi":
      series = data.trafficOverview?.timeSeries;
      break;
    default:
      series = data.trafficOverview?.timeSeries;
  }
  if (!series?.length) return [];
  return series.map((pt, i) => ({ i, v: pt.value }));
}

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
          <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={2} fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

function NumberFlash({ children, delay }: { children: React.ReactNode; delay: number }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.span
      initial={prefersReduced ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.4, delay, ease: EASE_OUT }}
      style={{ display: "inline-block" }}
    >
      {children}
    </motion.span>
  );
}

export function KpiCard({
  item,
  data,
  index,
  loading,
  animateNumbers,
}: {
  item: AssembledDashboardItem;
  data: ReportData;
  index: number;
  loading?: boolean;
  animateNumbers?: boolean;
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
        style={{ background: "var(--bone)", border: "1px solid var(--rule)", minHeight: "180px", opacity: 0.5 }}
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
    .find((m): m is Metric => Boolean(m));

  const headline = getRegistryHeadline(item.itemId, metric, data, t);
  const insight = getRegistryInsight(item.itemId, metric, data, t);
  const state = getChangeState(metric, item.itemId);
  const sparkData = getSparkData(item.itemId, data);
  const sparkId = `spark-kpi-${item.itemId}`;
  const SourceLogo = KPI_SOURCE_LOGO[item.itemId];

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
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        {/* Label + number grouped, icon floated top-right */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="eyebrow" style={{ color: "var(--slate)", letterSpacing: "0.1em" }}>
              {getKpiLabel(item.itemId, metric, t)}
            </p>
            <div className="flex items-baseline gap-3">
              <NumberFlash delay={0.1 + index * 0.05}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--charcoal)" }}>
                  {loading ? (
                    <motion.span
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      style={{ color: "var(--rule)", letterSpacing: "-0.02em" }}
                    >
                      ···
                    </motion.span>
                  ) : (
                    <AnimatedCounter value={metric.value} format={(n) => formatNumber(n, metric.unit)} animate={animateNumbers} />
                  )}
                </span>
              </NumberFlash>
              {isFull && secondaryMetric && !loading && (
                <span style={{ fontSize: "12px", color: "var(--slate)" }}>
                  {secondaryMetric.label}:{" "}
                  <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>
                    {formatNumber(secondaryMetric.value, secondaryMetric.unit)}
                  </span>
                </span>
              )}
            </div>
          </div>
          {SourceLogo && <SourceLogo className="h-7 w-7 shrink-0 mt-0.5" />}
        </div>

        {!loading && state && state.change.direction !== "flat" && (
          <div
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 self-start"
            style={{
              background: state.isGood ? "oklch(0.92 0.1 145)" : "oklch(0.92 0.08 20)",
              color: state.isGood ? "oklch(0.35 0.18 145)" : "oklch(0.4 0.2 20)",
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

        {!loading && isFull && (headline || insight) && (
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

      <div className="h-12 w-full overflow-hidden" style={{ marginTop: "auto" }}>
        {!loading && sparkData.length > 1 && (
          <SparklineReveal accent={SPARK_COLOR} sparkId={sparkId} sparkData={sparkData} delay={0.18 + index * 0.06} />
        )}
      </div>

      {loading && <ShimmerOverlay />}
    </motion.div>
  );
}
