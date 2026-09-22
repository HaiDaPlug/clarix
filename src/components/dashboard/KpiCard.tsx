"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShimmerOverlay } from "@/components/primitives/ShimmerCard";
import { currencyDecimals, formatNumber } from "@/lib/utils/format";
import { AssembledDashboardItem, DashboardItemId } from "@/types/dashboard";
import { Metric, ReportData } from "@/types/schema";
import { useLocale, type Translations } from "@/lib/i18n";
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

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;
// One entrance per card, staggered just enough to read as a row filling in.
const CARD_ENTER = (i: number) => ({ duration: 0.35, ease: EASE_OUT, delay: 0.04 * i });

/** What the card foregrounds. Usually the registry metric; the paid card
 *  leads with an efficiency figure when Ads provides one, because a spend
 *  total under the label "Betald effektivitet" says nothing about efficiency. */
type Display = {
  label: string;
  metric: Metric;
  format: (n: number) => string;
  decimals: number;
  /** A second figure set beside the number, quietly. */
  secondary?: { label: string; value: string };
  /** True when the number shown is the spend total itself. */
  isSpend: boolean;
};

function resolveDisplay(
  item: AssembledDashboardItem,
  data: ReportData,
  metric: Metric,
  secondaryMetric: Metric | undefined,
  t: Translations,
  locale: string,
): Display {
  const sv = locale === "sv";
  const decimalsFor = (m: Metric) =>
    m.unit === "currency" ? currencyDecimals(m.value) : m.unit === "percent" || !Number.isInteger(m.value) ? 1 : 0;

  if (item.itemId === "paid-efficiency-kpi") {
    const paid = data.paidOverview;
    const spend = { label: sv ? "Annonskostnad" : "Ad spend", value: formatNumber(metric.value, metric.unit) };
    if (paid?.roas) {
      return {
        label: t.dashboard.kpi.paidEfficiency,
        metric: paid.roas,
        format: (n) => `${formatNumber(n, "number")}×`,
        decimals: 1,
        secondary: spend,
        isSpend: false,
      };
    }
    if (paid?.costPerConversion) {
      return {
        label: sv ? "Kostnad per lead" : "Cost per lead",
        metric: paid.costPerConversion,
        format: (n) => formatNumber(n, "currency"),
        decimals: currencyDecimals(paid.costPerConversion.value),
        secondary: spend,
        isSpend: false,
      };
    }
    return {
      label: spend.label,
      metric,
      format: (n) => formatNumber(n, metric.unit),
      decimals: decimalsFor(metric),
      isSpend: true,
    };
  }

  return {
    label: getKpiLabel(item.itemId, metric, t),
    metric,
    format: (n) => formatNumber(n, metric.unit),
    decimals: decimalsFor(metric),
    secondary: secondaryMetric
      ? { label: secondaryMetric.label, value: formatNumber(secondaryMetric.value, secondaryMetric.unit) }
      : undefined,
    isSpend: false,
  };
}

// Only a series that is the metric itself. A card without one shows no line
// rather than borrowing total sessions and implying a shape it never had.
function getSparkData(itemId: DashboardItemId, data: ReportData, display: Display): { i: number; v: number }[] {
  let series: NonNullable<ReportData["trafficOverview"]>["timeSeries"] | undefined;
  switch (itemId) {
    case "traffic-kpi":
      series = data.trafficOverview?.timeSeries;
      break;
    case "search-clicks-kpi":
      series = data.seoOverview?.timeSeries;
      break;
    case "conversions-kpi":
      series = data.conversions?.timeSeries;
      break;
    case "paid-efficiency-kpi":
      // The paid series is daily spend; it only illustrates the spend total.
      series = display.isSpend ? data.paidOverview?.timeSeries : undefined;
      break;
    default:
      series = undefined;
  }
  if (!series?.length) return [];
  return series.map((pt, i) => ({ i, v: pt.value }));
}

function Sparkline({ sparkId, sparkData }: { sparkId: string; sparkData: { i: number; v: number }[] }) {
  const gradId = `grad-${sparkId}`;
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-coral)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--brand-coral)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="var(--brand-coral)"
          strokeWidth={1.75}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
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
  const { t, locale } = useLocale();
  const prefersReduced = useReducedMotion();
  const metric = getMetric(data, item.definition.metricPath);

  if (!metric) {
    return (
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CARD_ENTER(index)}
        className="surface-card flex flex-col items-center justify-center gap-1"
        style={{ minHeight: "160px", borderStyle: "dashed" }}
      >
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
          {getKpiLabel(item.itemId, undefined, t)}
        </p>
        <p style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>Ingen data tillgänglig</p>
      </motion.div>
    );
  }

  const isFull = item.eligibility.variant === "full";
  const secondaryMetric = isFull
    ? item.definition.secondaryMetricPaths
        ?.map((path) => getMetric(data, path))
        .find((m): m is Metric => Boolean(m))
    : undefined;

  const display = resolveDisplay(item, data, metric, secondaryMetric, t, locale);
  const headline = getRegistryHeadline(item.itemId, metric, data, t);
  const insight = getRegistryInsight(item.itemId, metric, data, t);
  const state = getChangeState(display.metric, item.itemId);
  const sparkData = getSparkData(item.itemId, data, display);
  const sparkId = `spark-kpi-${item.itemId}`;
  const SourceLogo = KPI_SOURCE_LOGO[item.itemId];

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={CARD_ENTER(index)}
      className="@container surface-card relative flex flex-col overflow-hidden"
    >
      {/* Source mark: present for attribution, small enough not to compete with the number. */}
      {SourceLogo && (
        <SourceLogo className="absolute right-5 top-5 h-[18px] w-[18px] opacity-80 @3xl:right-6 @3xl:top-6" />
      )}

      {/* Stacks in a normal card; splits into stat | insight once the card owns a wide row */}
      <div className="flex flex-col gap-3 px-5 pb-4 pt-5 @3xl:flex-row @3xl:items-start @3xl:gap-8 @3xl:px-6 @3xl:pb-5 @3xl:pt-6">
        <div className="flex min-w-0 flex-col gap-3 @3xl:flex-1">
          <div className="flex min-w-0 flex-col gap-1.5 pr-8">
            <p className="eyebrow truncate">{display.label}</p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="font-stat"
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontSize: "clamp(2rem, 4.2cqw, 2.6rem)",
                  fontWeight: 600,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? (
                  <span style={{ color: "var(--line)" }}>···</span>
                ) : (
                  <NumberTicker
                    value={display.metric.value}
                    decimalPlaces={display.decimals}
                    format={display.format}
                    animate={animateNumbers}
                  />
                )}
              </span>
              {display.secondary && !loading && (
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {display.secondary.label}{" "}
                  <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {display.secondary.value}
                  </span>
                </span>
              )}
            </div>
          </div>

          {!loading && state && state.change.direction !== "flat" && (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-0.5 rounded-full py-0.5 pl-1.5 pr-2 tabular-nums"
                style={{
                  background: state.isGood ? "var(--signal-up-bg)" : "var(--signal-down-bg)",
                  color: state.isGood ? "var(--signal-up)" : "var(--signal-down)",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {state.change.direction === "up"
                  ? <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                  : <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
                {state.change.value}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{t.dashboard.kpi.vsPrior}</span>
            </div>
          )}
        </div>

        {!loading && isFull && (headline || insight) && (
          <div
            className="mt-1 border-t pt-3 @3xl:mt-0 @3xl:flex-1 @3xl:self-stretch @3xl:border-l @3xl:border-t-0 @3xl:pl-8 @3xl:pr-8 @3xl:pt-1"
            style={{ borderColor: "var(--line-soft)" }}
          >
            {headline && (
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: "3px" }}>
                {headline}
              </p>
            )}
            {insight && (
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {insight}
              </p>
            )}
          </div>
        )}
      </div>

      {!loading && sparkData.length > 1 && (
        <div className="h-10 w-full overflow-hidden @3xl:h-20" style={{ marginTop: "auto" }}>
          <Sparkline sparkId={sparkId} sparkData={sparkData} />
        </div>
      )}

      {loading && <ShimmerOverlay />}
    </motion.div>
  );
}
