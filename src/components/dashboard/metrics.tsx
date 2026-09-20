"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
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
  const upIsGood = metric.trendGood !== false;
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

/** Signed change against the previous period. Green only when the movement
 *  is good for the business, so a falling cost reads green and a falling
 *  conversion rate reads red. Flat and unknown render nothing. */
export function DeltaText({ metric, itemId }: { metric: Metric; itemId?: DashboardItemId }) {
  const state = getChangeState(metric, itemId);
  if (!state || state.change.direction === "flat") return null;

  return (
    <span
      className="inline-flex items-center gap-0.5 tabular-nums"
      style={{
        fontSize: "12px",
        fontWeight: 700,
        color: state.isGood ? "var(--signal-up)" : "var(--signal-down)",
      }}
    >
      {state.change.direction === "up"
        ? <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        : <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
      {state.change.value}
    </span>
  );
}

export function MetricTile({ metric, itemId }: { metric: Metric; itemId?: DashboardItemId }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="eyebrow truncate">{metric.label}</p>
      <p
        className="font-stat"
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: "1.5rem",
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}
      >
        {formatNumber(metric.value, metric.unit)}
      </p>
      <DeltaText metric={metric} itemId={itemId} />
    </div>
  );
}
