"use client";

import { formatChange, formatNumber } from "@/lib/utils/format";
import { DashboardItemId } from "@/types/dashboard";
import { Metric } from "@/types/schema";
import { Translations } from "@/lib/i18n";
import { getNestedField } from "@/lib/utils/field-check";
import { ReportData } from "@/types/schema";

export function getMetric(data: ReportData, path?: string): Metric | undefined {
  if (!path) return undefined;
  return getNestedField(data, path) as Metric | undefined;
}

export function getChangeState(metric: Metric, itemId?: DashboardItemId) {
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

export function getKpiLabel(itemId: DashboardItemId, metric: Metric | undefined, t: Translations): string {
  if (itemId === "engagement-kpi") return t.dashboard.kpi.engagement;
  if (itemId === "paid-efficiency-kpi") return t.dashboard.kpi.paidEfficiency;
  if (itemId === "conversions-kpi") return t.dashboard.kpi.conversions;
  return metric?.label ?? "";
}

export function getRegistryHeadline(itemId: DashboardItemId, metric: Metric, data: ReportData, t: Translations): string | undefined {
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

export function getRegistryInsight(itemId: DashboardItemId, metric: Metric, data: ReportData, t: Translations): string | undefined {
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

export function DeltaText({ metric, itemId }: { metric: Metric; itemId?: DashboardItemId }) {
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
      {state.change.direction === "up" ? "↑" : "↓"}
      {state.change.value}
    </span>
  );
}

export function MetricTile({ metric, itemId }: { metric: Metric; itemId?: DashboardItemId }) {
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
