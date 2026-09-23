import type { Metric, ReportData } from "@/types/schema";
import { formatNumber } from "@/lib/utils/format";

/** A figure a suggestion rests on, straight from the report data, so the
 *  reader can inspect what the advice is built on. */
export interface Evidence {
  label: string;
  value: string;
  previous?: string;
}

export function metricEvidence(metric: Metric | undefined, suffix = ""): Evidence | null {
  if (!metric) return null;
  return {
    label: metric.label,
    value: `${formatNumber(metric.value, metric.unit)}${suffix}`,
    previous: metric.previousValue !== undefined ? `${formatNumber(metric.previousValue, metric.unit)}${suffix}` : undefined,
  };
}

/**
 * Every metric the model may cite behind a next step, by a stable key. The
 * model only ever returns keys; the figures shown are looked up here, so a
 * tooltip can never display a number the data does not contain.
 */
export function buildEvidenceRegistry(data: ReportData): Record<string, Evidence> {
  const t = data.trafficOverview;
  const seo = data.seoOverview;
  const conv = data.conversions;
  const paid = data.paidOverview;

  const entries: [string, Evidence | null][] = [
    ["sessions", metricEvidence(t?.totalSessions)],
    ["organic_sessions", metricEvidence(t?.organicSessions)],
    ["paid_sessions", metricEvidence(t?.paidSessions)],
    ["bounce_rate", metricEvidence(t?.bounceRate)],
    ["engagement_rate", metricEvidence(t?.engagementRate)],
    ["conversions", metricEvidence(conv?.totalConversions)],
    ["conversion_rate", metricEvidence(conv?.conversionRate)],
    ["search_clicks", metricEvidence(seo?.totalClicks)],
    ["search_impressions", metricEvidence(seo?.totalImpressions)],
    ["search_position", metricEvidence(seo?.avgPosition)],
    ["search_ctr", metricEvidence(seo?.avgCtr)],
    ["ad_spend", metricEvidence(paid?.totalSpend)],
    ["ad_conversions", metricEvidence(paid?.conversions)],
    ["cost_per_conversion", metricEvidence(paid?.costPerConversion)],
    ["roas", metricEvidence(paid?.roas, "×")],
  ];

  return Object.fromEntries(entries.filter((e): e is [string, Evidence] => e[1] !== null));
}
