import type { ExecutiveSummary, ReportData } from "@/types/schema";
import { formatNumber } from "@/lib/utils/format";

type Locale = "sv" | "en";
type Highlight = ExecutiveSummary["highlights"][number];
type MetricLike = NonNullable<ReportData["trafficOverview"]>["totalSessions"];
type KpiSnapshotWithPrimaryMetric = ReportData["kpiSnapshot"] & {
  primaryMetric?: MetricLike;
};

const COPY = {
  en: {
    sessions: "Sessions",
    organicClicks: "Organic clicks",
    avgPosition: "Avg. position",
    conversions: "Conversions",
    trafficGrowing: "Traffic is growing this period.",
    trafficDipped: "Traffic dipped this period.",
    searchSteady: "Search visibility is holding steady.",
    fallbackHeadline: "Here's your performance summary.",
    totalSessions: (value: string) => `Total sessions: ${value} this period.`,
  },
  sv: {
    sessions: "Sessioner",
    organicClicks: "Organiska klick",
    avgPosition: "Snittposition",
    conversions: "Konverteringar",
    trafficGrowing: "Trafiken växer den här perioden.",
    trafficDipped: "Trafiken sjönk den här perioden.",
    searchSteady: "Söksynligheten håller sig stabil.",
    fallbackHeadline: "Här är din prestandaöversikt.",
    totalSessions: (value: string) => `Totalt antal sessioner: ${value} den här perioden.`,
  },
} as const;

export function deriveExecutiveSummary(
  data: ReportData,
  locale: Locale,
): ExecutiveSummary {
  const copy = COPY[locale];
  const trafficSessions = data.trafficOverview?.totalSessions;
  const kpiSnapshot = data.kpiSnapshot as KpiSnapshotWithPrimaryMetric | undefined;

  const highlightCandidates = [
    trafficSessions ? createHighlight(copy.sessions, trafficSessions) : undefined,
    data.seoOverview?.totalClicks
      ? createHighlight(copy.organicClicks, data.seoOverview.totalClicks)
      : undefined,
    data.seoOverview?.avgPosition
      ? createHighlight(copy.avgPosition, data.seoOverview.avgPosition, true)
      : undefined,
    kpiSnapshot?.primaryMetric
      ? createHighlight(kpiSnapshot.primaryMetric.label, kpiSnapshot.primaryMetric)
      : undefined,
    data.conversions?.totalConversions
      ? createHighlight(copy.conversions, data.conversions.totalConversions)
      : undefined,
  ];

  return {
    headline: deriveHeadline(data, locale),
    subheadline: trafficSessions
      ? copy.totalSessions(formatNumber(trafficSessions.value, trafficSessions.unit))
      : undefined,
    paragraphs: [],
    highlights: highlightCandidates.filter((highlight): highlight is Highlight =>
      Boolean(highlight),
    ).slice(0, 4),
  };
}

function deriveHeadline(data: ReportData, locale: Locale): string {
  const copy = COPY[locale];
  const trafficTrend = data.trafficOverview?.totalSessions.trend;

  if (trafficTrend === "up") return copy.trafficGrowing;
  if (trafficTrend === "down") return copy.trafficDipped;
  if (!data.trafficOverview && data.seoOverview) return copy.searchSteady;
  return copy.fallbackHeadline;
}

function createHighlight(
  label: string,
  metric: MetricLike,
  invertSentiment = false,
): Highlight {
  return {
    label,
    value: formatMetricValue(metric),
    sentiment: getSentiment(metric, invertSentiment),
  };
}

function formatMetricValue(metric: MetricLike): string {
  if (metric.previousValue === undefined || metric.previousValue === 0) {
    return formatNumber(metric.value, metric.unit);
  }

  const change = ((metric.value - metric.previousValue) / Math.abs(metric.previousValue)) * 100;
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  return `${sign}${Math.abs(change).toFixed(0)}%`;
}

function getSentiment(
  metric: MetricLike,
  invertSentiment: boolean,
): Highlight["sentiment"] {
  if (!metric.trend || metric.trend === "flat") return "neutral";

  const trendGood = invertSentiment ? false : metric.trendGood;
  if (trendGood === true) return metric.trend === "up" ? "positive" : "negative";
  if (trendGood === false) return metric.trend === "down" ? "positive" : "negative";
  return "neutral";
}
