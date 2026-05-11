import type { KpiSnapshot, SeoOverview, TimeSeriesPoint, TopPages } from "@/types/schema";
import { formatPeriod, gscCoverageForRange } from "./date-range";
import type {
  DateRange,
  GoogleReportLocale,
  GscResponseSet,
  GscSearchAnalyticsResponse,
  PartialReportData,
} from "./report-types";
import {
  createMetric,
  gscRows,
  isDefined,
  label,
  pathFromUrl,
  round,
  safeNumber,
} from "./mapper-utils";

type GscSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export function mapGscReport(params: {
  current: GscResponseSet;
  prior: GscResponseSet;
  dateRange: DateRange;
  priorDateRange: DateRange;
  locale: GoogleReportLocale;
  syncedAt?: string;
  today?: Date;
}): PartialReportData {
  const summary = readGscSummary(params.current.summary);
  if (!summary) {
    return {
      sourceConfidence: {
        gsc: gscSourceConfidence(params.dateRange, params.syncedAt, params.today),
      },
    };
  }

  const priorSummary = readGscSummary(params.prior.summary);
  const topQueries = readGscTopQueries(params.current.topQueries);
  const seoOverview: SeoOverview = {
    totalClicks: createMetric({
      value: summary.clicks,
      previousValue: priorSummary?.clicks,
      unit: "number",
      label: label(params.locale, "clicks"),
      trendGoodKey: "totalClicks",
    }),
    totalImpressions: createMetric({
      value: summary.impressions,
      previousValue: priorSummary?.impressions,
      unit: "number",
      label: label(params.locale, "impressions"),
      trendGoodKey: "totalImpressions",
    }),
    avgCtr: createMetric({
      value: summary.ctr * 100,
      previousValue: priorSummary === undefined ? undefined : priorSummary.ctr * 100,
      unit: "percent",
      label: label(params.locale, "ctr"),
      trendGoodKey: "avgCtr",
    }),
    avgPosition: createMetric({
      value: round(summary.position),
      previousValue:
        priorSummary === undefined ? undefined : round(priorSummary.position),
      unit: "number",
      label: label(params.locale, "position"),
      trendGoodKey: "avgPosition",
    }),
    timeSeries: readGscTimeSeries(params.current.timeSeries),
    topQueries: topQueries.length > 0 ? topQueries : undefined,
  };

  const topPages = mapGscTopPages(params.current.topPages);
  const kpiSnapshot: KpiSnapshot = {
    period: formatPeriod(params.dateRange),
    comparisonPeriod: formatPeriod(params.priorDateRange),
    metrics: [
      seoOverview.totalClicks,
      seoOverview.totalImpressions,
      seoOverview.avgCtr,
      seoOverview.avgPosition,
    ],
  };

  return {
    seoOverview,
    kpiSnapshot,
    topPages: topPages.pages.length > 0 ? topPages : undefined,
    sourceConfidence: {
      gsc: gscSourceConfidence(params.dateRange, params.syncedAt, params.today),
    },
  };
}

function mapGscTopPages(current: GscSearchAnalyticsResponse): TopPages {
  return {
    pages: gscRows(current)
      .map((row) => {
        const sourceUrl = row.keys?.[0];
        if (!sourceUrl) return undefined;

        return {
          url: pathFromUrl(sourceUrl),
          clicks: safeNumber(row.clicks),
          impressions: safeNumber(row.impressions),
          position:
            row.position === undefined ? undefined : round(safeNumber(row.position)),
        };
      })
      .filter(isDefined),
  };
}

function readGscSummary(response: GscSearchAnalyticsResponse): GscSummary | undefined {
  const row = gscRows(response)[0];
  if (!row) return undefined;

  return {
    clicks: safeNumber(row.clicks),
    impressions: safeNumber(row.impressions),
    ctr: safeNumber(row.ctr),
    position: safeNumber(row.position),
  };
}

function readGscTimeSeries(response: GscSearchAnalyticsResponse): TimeSeriesPoint[] {
  return gscRows(response)
    .map((row) => {
      const date = row.keys?.[0];
      if (!date) return undefined;
      return { date, value: safeNumber(row.clicks) };
    })
    .filter(isDefined);
}

function readGscTopQueries(
  response: GscSearchAnalyticsResponse,
): NonNullable<SeoOverview["topQueries"]> {
  return gscRows(response)
    .map((row) => {
      const query = row.keys?.[0];
      if (!query) return undefined;
      return {
        query,
        clicks: safeNumber(row.clicks),
        impressions: safeNumber(row.impressions),
        position: round(safeNumber(row.position)),
        ctr: safeNumber(row.ctr) * 100,
      };
    })
    .filter(isDefined);
}

function gscSourceConfidence(
  range: DateRange,
  syncedAt = new Date().toISOString(),
  today?: Date,
): NonNullable<PartialReportData["sourceConfidence"]>[string] {
  return {
    connected: true,
    lastSync: syncedAt,
    coverage: gscCoverageForRange(range.endDate, today),
  };
}
