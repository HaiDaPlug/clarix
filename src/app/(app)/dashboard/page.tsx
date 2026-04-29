"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  localizeMockReportData,
  scenario1,
  scenario2,
  scenario3,
} from "@/lib/mock-data";
import { assembleDashboard } from "@/lib/dashboard/assemble";
import { TrendLine } from "@/components/charts/TrendLine";
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

const PERIOD_KEYS = ["thisMonth", "lastMonth", "custom"] as const;
type PeriodKey = (typeof PERIOD_KEYS)[number];
type Period = PeriodKey;

const EASING = [0.16, 1, 0.3, 1] as const;

function getMetric(data: ReportData, path?: string): Metric | undefined {
  if (!path) return undefined;
  return getNestedField(data, path) as Metric | undefined;
}

function getKpiLabel(itemId: DashboardItemId, metric: Metric, t: Translations): string {
  if (itemId === "engagement-kpi") return t.dashboard.kpi.engagement;
  if (itemId === "paid-efficiency-kpi") return t.dashboard.kpi.paidEfficiency;
  if (itemId === "conversions-kpi") return t.dashboard.kpi.conversions;
  return metric.label;
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
          color: isNegative ? "#B91C1C" : "#15803D",
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.04, ease: EASING }}
      className="rounded-3xl p-8 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #E8E6FF 0%, #F0EEFF 45%, #FAF9FF 100%)",
        minHeight: "200px",
        border: "1px solid rgba(108,92,231,0.3)",
      }}
    >
      {/* Grain overlay */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "160px 160px",
          opacity: 0.055,
          mixBlendMode: "multiply",
        }}
      />
      <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
        <p
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6C5CE7",
          }}
        >
          {t.dashboard.hero.subtitle(data.meta.period.label)}
        </p>

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.2rem, 2.1vw, 1.6rem)",
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.025em",
            color: "#0F0E0C",
            maxWidth: "480px",
          }}
        >
          {colorizeNumbers(summary.headline)}
        </p>

        {isFull && summary.subheadline && (
          <p
            style={{
              fontSize: "15px",
              fontWeight: 400,
              lineHeight: 1.6,
              color: "#6B6577",
              maxWidth: "520px",
            }}
          >
            {colorizeNumbers(summary.subheadline)}
          </p>
        )}

        {isFull && summary.highlights.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {summary.highlights.map((highlight, i) => (
              <span
                key={`${highlight.label}-${i}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "rgba(108,92,231,0.08)",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color:
                      highlight.sentiment === "positive"
                        ? "#15803D"
                        : highlight.sentiment === "negative"
                          ? "#B91C1C"
                          : "#4C47A8",
                  }}
                >
                  {highlight.value}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 400, color: "#6B6577" }}>
                  {highlight.label}
                </span>
              </span>
            ))}
          </div>
        )}

        <div>
          <Link
            href="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-opacity hover:opacity-85"
            style={{
              background: "linear-gradient(135deg, #8B78FF, #6C5CE7)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t.dashboard.hero.readReport}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7h8M7 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </motion.div>
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
  if (!metric) return null;

  const isFull = item.eligibility.variant === "full";
  const secondaryMetric = item.definition.secondaryMetricPaths
    ?.map((path) => getMetric(data, path))
    .find((candidate): candidate is Metric => Boolean(candidate));

  const headline = getRegistryHeadline(item.itemId, metric, data, t);
  const insight = getRegistryInsight(item.itemId, metric, data, t);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 + index * 0.05, ease: EASING }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <p className="eyebrow" style={{ color: "var(--slate)" }}>
        {getKpiLabel(item.itemId, metric, t)}
      </p>

      <div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: "var(--charcoal)",
          }}
        >
          {formatNumber(metric.value, metric.unit)}
        </p>
        <ChangeChip metric={metric} itemId={item.itemId} t={t} />
        {isFull && secondaryMetric && (
          <p style={{ fontSize: "12px", color: "var(--slate)", marginTop: "8px" }}>
            {secondaryMetric.label}:{" "}
            <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>
              {formatNumber(secondaryMetric.value, secondaryMetric.unit)}
            </span>
          </p>
        )}
      </div>

      {isFull && (headline || insight) && (
        <div style={{ borderTop: "1px solid var(--rule-light)", paddingTop: "12px" }}>
          {headline && (
            <p
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--charcoal)",
                marginBottom: "2px",
              }}
            >
              {headline}
            </p>
          )}
          {insight && (
            <p style={{ fontSize: "12.5px", color: "var(--slate)", lineHeight: 1.5 }}>
              {insight}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SessionsChart({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const traffic = data.trafficOverview;
  if (!traffic?.timeSeries) return null;

  const isFull = item.eligibility.variant === "full";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.18, ease: EASING }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      {isFull && (
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="eyebrow mb-2 flex items-center gap-1.5" style={{ color: "var(--slate)" }}>
              {t.dashboard.sessions.eyebrow}
              <InfoTooltip text={t.dashboard.sessions.eyebrowTooltip} />
            </p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--charcoal)",
              }}
            >
              {t.registry.sessionsChart.narrative}
            </p>
            <p style={{ fontSize: "13px", color: "var(--slate)", marginTop: "4px" }}>
              {t.dashboard.sessions.totalSessions(formatNumber(traffic.totalSessions.value, "number"))}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 ml-6">
            <span
              className="flex items-center gap-1.5"
              style={{ fontSize: "11px", color: "var(--slate-light)" }}
            >
              <span
                className="w-4 h-px inline-block rounded-full"
                style={{ background: "linear-gradient(to right, var(--accent-coral), var(--accent-amber))" }}
              />
              {t.dashboard.sessions.allSessions}
            </span>
          </div>
        </div>
      )}

      {!isFull && (
        <p className="eyebrow mb-4 flex items-center gap-1.5" style={{ color: "var(--slate)" }}>
          {t.dashboard.sessions.eyebrow}
          <InfoTooltip text={t.dashboard.sessions.eyebrowTooltip} />
        </p>
      )}

      <TrendLine
        data={traffic.timeSeries}
        height={200}
        showGrid
        showAxes
        unit="number"
        useAccent
      />
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

function ChannelBreakdown({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const rows = getChannelRows(data, t);
  if (!rows.length) return null;

  const isFull = item.eligibility.variant === "full";

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <p className="eyebrow mb-1" style={{ color: "var(--slate)" }}>
        {t.dashboard.channels.eyebrow}
      </p>
      {isFull && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "var(--charcoal)",
            marginBottom: "20px",
            letterSpacing: "-0.015em",
          }}
        >
          {t.registry.channelBreakdown.narrative}
        </p>
      )}
      <div className="flex flex-col gap-5" style={{ marginTop: isFull ? 0 : "16px" }}>
        {rows.map((row) => {
          const pct = Math.round(row.share);
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: "13px", color: "var(--charcoal)", fontWeight: 500 }}>
                  {row.label}
                </span>
                <div className="flex items-center gap-2">
                  {isFull && row.metric && <DeltaText metric={row.metric} />}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--charcoal)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatNumber(row.value, "number")}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--slate-light)",
                      minWidth: "2.5rem",
                      textAlign: "right",
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--rule)" }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(to right, var(--accent-coral), var(--accent-amber))",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchVisibility({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const seo = data.seoOverview;
  if (!seo) return null;

  const isFull = item.eligibility.variant === "full";

  return (
    <div
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
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "var(--charcoal)",
            marginBottom: "20px",
            letterSpacing: "-0.015em",
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
    </div>
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
    <div
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
            fontSize: "1.1rem",
            fontWeight: 600,
            color: "var(--charcoal)",
            marginBottom: "20px",
            letterSpacing: "-0.015em",
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
    </div>
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
  const [period, setPeriod] = useState<Period>("thisMonth");
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
    let cancelled = false;

    async function loadRealData() {
      setIsLoadingRealData(true);
      setDataError(null);
      setReportData(fallbackData);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"]);

      if (cancelled) return;

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
            });

            if (response.status === 401 || response.status === 403) {
              expired.push(source.source === "ga4" ? "Google Analytics" : "Search Console");
              return undefined;
            }
            if (!response.ok) return undefined;
            return (await response.json()) as Partial<ReportData>;
          } catch {
            return undefined;
          }
        }),
      );

      if (cancelled) return;

      setExpiredSources(expired);
      const connectedSourceIds = sources.map((source) => source.source);
      const merged = mergeReportData(
        fallbackData,
        parts,
        connectedSourceIds as ConnectableSource[],
      );
      if (!merged.executiveSummary) {
        merged.executiveSummary = deriveExecutiveSummary(merged, locale);
      }
      setReportData(merged);
      setIsLoadingRealData(false);
    }

    loadRealData();

    return () => {
      cancelled = true;
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

        <div
          className="flex items-center rounded-xl p-1 gap-0.5"
          style={{ backgroundColor: "var(--bone-dark)" }}
        >
          {PERIOD_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className="px-4 py-1.5 rounded-lg text-sm transition-all cursor-pointer"
              style={{
                backgroundColor: period === key ? "white" : "transparent",
                color: period === key ? "var(--charcoal)" : "var(--slate)",
                fontWeight: period === key ? 500 : 400,
                boxShadow: period === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t.dashboard.periods[key]}
            </button>
          ))}
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASING }}
            className="grid grid-cols-4 gap-4"
          >
            {kpiItems.map((item, index) => (
              <KpiCard key={item.itemId} item={item} data={activeData} index={index} />
            ))}
          </motion.div>
        )}

        {chartItems.map((item) => (
          <SessionsChart key={item.itemId} item={item} data={activeData} />
        ))}

        {sectionItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: EASING }}
            className="grid grid-cols-2 gap-4"
          >
            {sectionItems.map((item) => (
              <SectionItem key={item.itemId} item={item} data={activeData} />
            ))}
          </motion.div>
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
