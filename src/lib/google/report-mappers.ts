import type {
  Conversion,
  KpiSnapshot,
  Metric,
  SeoOverview,
  TimeSeriesPoint,
  TopPages,
  TrafficOverview,
} from "@/types/schema";
import { formatPeriod, gscCoverageForRange } from "./date-range";
import type {
  DateRange,
  Ga4ResponseSet,
  Ga4RunReportResponse,
  GoogleReportLocale,
  GscResponseSet,
  GscSearchAnalyticsResponse,
  GscSearchAnalyticsRow,
  PartialReportData,
} from "./report-types";

type MetricTrend = "up" | "down" | "flat";
type MetricUnit = Metric["unit"];

const LABELS = {
  en: {
    sessions: "Total Sessions",
    totalUsers: "Users",
    newUsers: "New Users",
    bounceRate: "Bounce Rate",
    engagementRate: "Engagement Rate",
    averageSessionDuration: "Avg. Duration",
    conversions: "Conversions",
    conversionRate: "Conversion Rate",
    "Organic Search": "Organic Search",
    "Paid Search": "Paid Search",
    Direct: "Direct",
    Referral: "Referral",
    Social: "Social",
    clicks: "Total Clicks",
    impressions: "Total Impressions",
    ctr: "Avg. CTR",
    position: "Avg. Position",
  },
  sv: {
    sessions: "Totala sessioner",
    totalUsers: "Användare",
    newUsers: "Nya användare",
    bounceRate: "Avvisningsfrekvens",
    engagementRate: "Engagemangsgrad",
    averageSessionDuration: "Genomsn. besökstid",
    conversions: "Konverteringar",
    conversionRate: "Konverteringsgrad",
    "Organic Search": "Organisk sökning",
    "Paid Search": "Betald sökning",
    Direct: "Direkt",
    Referral: "Hänvisning",
    Social: "Sociala medier",
    clicks: "Totala klick",
    impressions: "Totala visningar",
    ctr: "Genomsn. CTR",
    position: "Genomsn. position",
  },
} satisfies Record<GoogleReportLocale, Record<string, string>>;

const TREND_GOOD_WHEN_UP = {
  sessions: true,
  organicSessions: true,
  paidSessions: true,
  directSessions: true,
  referralSessions: true,
  totalClicks: true,
  totalImpressions: true,
  avgCtr: true,
  avgPosition: false,
  bounceRate: false,
  engagementRate: true,
  conversions: true,
  conversionRate: true,
  averageSessionDuration: true,
} satisfies Record<string, boolean>;

export function mapGa4Report(params: {
  current: Ga4ResponseSet;
  prior: Ga4ResponseSet;
  dateRange: DateRange;
  priorDateRange: DateRange;
  locale: GoogleReportLocale;
  syncedAt?: string;
}): PartialReportData {
  const summary = readGa4Summary(params.current.summary);
  if (!summary) {
    return {
      sourceConfidence: {
        ga4: ga4SourceConfidence(params.current, params.prior, params.syncedAt),
      },
    };
  }

  const priorSummary = readGa4Summary(params.prior.summary);
  const channels = readGa4Channels(params.current.channels);
  const priorChannels = readGa4Channels(params.prior.channels);

  const channelBreakdown =
    channels.rows.length > 0
      ? channels.rows.map((row) => ({
          channel: label(params.locale, row.channel),
          sessions: row.sessions,
          share: channels.totalSessions
            ? round((row.sessions / channels.totalSessions) * 100)
            : 0,
        }))
      : undefined;

  const trafficOverview: TrafficOverview = {
    totalSessions: createMetric({
      value: summary.sessions,
      previousValue: priorSummary?.sessions,
      unit: "number",
      label: label(params.locale, "sessions"),
      trendGoodKey: "sessions",
    }),
    organicSessions: channelMetric(
      params.locale,
      "Organic Search",
      channels.byName.get("Organic Search"),
      priorChannels.byName.get("Organic Search"),
      "organicSessions",
    ),
    paidSessions: channelMetric(
      params.locale,
      "Paid Search",
      channels.byName.get("Paid Search"),
      priorChannels.byName.get("Paid Search"),
      "paidSessions",
    ),
    directSessions: channelMetric(
      params.locale,
      "Direct",
      channels.byName.get("Direct"),
      priorChannels.byName.get("Direct"),
      "directSessions",
    ),
    referralSessions: channelMetric(
      params.locale,
      "Referral",
      channels.byName.get("Referral"),
      priorChannels.byName.get("Referral"),
      "referralSessions",
    ),
    bounceRate: createMetric({
      value: summary.bounceRate * 100,
      previousValue:
        priorSummary === undefined ? undefined : priorSummary.bounceRate * 100,
      unit: "percent",
      label: label(params.locale, "bounceRate"),
      trendGoodKey: "bounceRate",
    }),
    avgSessionDuration: createMetric({
      value: summary.averageSessionDuration,
      previousValue: priorSummary?.averageSessionDuration,
      unit: "seconds",
      label: label(params.locale, "averageSessionDuration"),
      trendGoodKey: "averageSessionDuration",
    }),
    timeSeries: readGa4TimeSeries(params.current.timeSeries),
    channelBreakdown,
  };

  const conversions =
    summary.conversions > 0
      ? mapConversions(params.locale, summary, priorSummary)
      : undefined;

  const kpiSnapshot = mapGa4KpiSnapshot({
    locale: params.locale,
    dateRange: params.dateRange,
    priorDateRange: params.priorDateRange,
    summary,
    priorSummary,
    organicSessions: channels.byName.get("Organic Search"),
    priorOrganicSessions: priorChannels.byName.get("Organic Search"),
  });

  const topPages = mapGa4TopPages(
    params.current.topPages,
    params.prior.topPages,
  );

  return {
    trafficOverview,
    conversions,
    kpiSnapshot,
    topPages: topPages.pages.length > 0 ? topPages : undefined,
    sourceConfidence: {
      ga4: ga4SourceConfidence(params.current, params.prior, params.syncedAt),
    },
  };
}

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

  return {
    seoOverview,
    kpiSnapshot: mapGscKpiSnapshot({
      locale: params.locale,
      dateRange: params.dateRange,
      priorDateRange: params.priorDateRange,
      summary,
      priorSummary,
    }),
    topPages: topPages.pages.length > 0 ? topPages : undefined,
    sourceConfidence: {
      gsc: gscSourceConfidence(params.dateRange, params.syncedAt, params.today),
    },
  };
}

function mapConversions(
  locale: GoogleReportLocale,
  summary: Ga4Summary,
  priorSummary: Ga4Summary | undefined,
): Conversion {
  return {
    totalConversions: createMetric({
      value: summary.conversions,
      previousValue: priorSummary?.conversions,
      unit: "number",
      label: label(locale, "conversions"),
      trendGoodKey: "conversions",
    }),
    conversionRate: createMetric({
      value: summary.conversionRate * 100,
      previousValue:
        priorSummary === undefined ? undefined : priorSummary.conversionRate * 100,
      unit: "percent",
      label: label(locale, "conversionRate"),
      trendGoodKey: "conversionRate",
    }),
  };
}

function mapGa4KpiSnapshot(params: {
  locale: GoogleReportLocale;
  dateRange: DateRange;
  priorDateRange: DateRange;
  summary: Ga4Summary;
  priorSummary: Ga4Summary | undefined;
  organicSessions: number | undefined;
  priorOrganicSessions: number | undefined;
}): KpiSnapshot {
  const metrics: Metric[] = [
    createMetric({
      value: params.summary.sessions,
      previousValue: params.priorSummary?.sessions,
      unit: "number",
      label: label(params.locale, "sessions"),
      trendGoodKey: "sessions",
    }),
  ];

  if (params.organicSessions !== undefined) {
    metrics.push(
      createMetric({
        value: params.organicSessions,
        previousValue: params.priorOrganicSessions,
        unit: "number",
        label: label(params.locale, "Organic Search"),
        trendGoodKey: "organicSessions",
      }),
    );
  }

  metrics.push(
    createMetric({
      value: params.summary.bounceRate * 100,
      previousValue:
        params.priorSummary === undefined
          ? undefined
          : params.priorSummary.bounceRate * 100,
      unit: "percent",
      label: label(params.locale, "bounceRate"),
      trendGoodKey: "bounceRate",
    }),
  );

  if (params.summary.conversions > 0) {
    metrics.push(
      createMetric({
        value: params.summary.conversions,
        previousValue: params.priorSummary?.conversions,
        unit: "number",
        label: label(params.locale, "conversions"),
        trendGoodKey: "conversions",
      }),
    );
  }

  return {
    period: formatPeriod(params.dateRange),
    comparisonPeriod: formatPeriod(params.priorDateRange),
    metrics: metrics.slice(0, 6),
  };
}

function mapGscKpiSnapshot(params: {
  locale: GoogleReportLocale;
  dateRange: DateRange;
  priorDateRange: DateRange;
  summary: GscSummary;
  priorSummary: GscSummary | undefined;
}): KpiSnapshot {
  return {
    period: formatPeriod(params.dateRange),
    comparisonPeriod: formatPeriod(params.priorDateRange),
    metrics: [
      createMetric({
        value: params.summary.clicks,
        previousValue: params.priorSummary?.clicks,
        unit: "number",
        label: label(params.locale, "clicks"),
        trendGoodKey: "totalClicks",
      }),
      createMetric({
        value: round(params.summary.position),
        previousValue:
          params.priorSummary === undefined
            ? undefined
            : round(params.priorSummary.position),
        unit: "number",
        label: label(params.locale, "position"),
        trendGoodKey: "avgPosition",
      }),
    ],
  };
}

function mapGa4TopPages(
  current: Ga4RunReportResponse,
  prior: Ga4RunReportResponse,
): TopPages {
  const priorSessionsByPath = new Map(
    ga4Rows(prior)
      .map((row) => [dimension(row, prior, "pagePath", 0), metricNumber(row, prior, "sessions", 0)] as const)
      .filter((entry): entry is readonly [string, number] => Boolean(entry[0]) && entry[1] !== undefined),
  );

  return {
    pages: ga4Rows(current)
      .map((row) => {
        const url = dimension(row, current, "pagePath", 0);
        const sessions = metricNumber(row, current, "sessions", 0);
        if (!url || sessions === undefined) return undefined;

        const previousSessions = priorSessionsByPath.get(url);
        return {
          url,
          title: dimension(row, current, "pageTitle", 1),
          sessions,
          bounceRate: multiplyPercent(metricNumber(row, current, "bounceRate", 1)),
          trend:
            previousSessions === undefined
              ? undefined
              : trendFor(sessions, previousSessions),
        };
      })
      .filter(isDefined),
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

function readGa4Summary(response: Ga4RunReportResponse): Ga4Summary | undefined {
  const row = ga4Rows(response)[0];
  if (!row) return undefined;

  const sessions = metricNumber(row, response, "sessions", 0);
  if (sessions === undefined) return undefined;

  return {
    sessions,
    totalUsers: metricNumber(row, response, "totalUsers", 1) ?? 0,
    newUsers: metricNumber(row, response, "newUsers", 2) ?? 0,
    bounceRate: metricNumber(row, response, "bounceRate", 3) ?? 0,
    engagementRate: metricNumber(row, response, "engagementRate", 4) ?? 0,
    averageSessionDuration:
      metricNumber(row, response, "averageSessionDuration", 5) ?? 0,
    conversions: metricNumber(row, response, "conversions", 6) ?? 0,
    conversionRate: metricNumber(row, response, "conversionRate", 7) ?? 0,
  };
}

function readGa4Channels(response: Ga4RunReportResponse): {
  rows: Array<{ channel: string; sessions: number }>;
  byName: Map<string, number>;
  totalSessions: number;
} {
  const rows = ga4Rows(response)
    .map((row) => {
      const channel = dimension(row, response, "sessionDefaultChannelGroup", 0);
      const sessions = metricNumber(row, response, "sessions", 0);
      if (!channel || sessions === undefined) return undefined;
      return { channel, sessions };
    })
    .filter(isDefined);

  return {
    rows,
    byName: new Map(rows.map((row) => [row.channel, row.sessions])),
    totalSessions: rows.reduce((total, row) => total + row.sessions, 0),
  };
}

function readGa4TimeSeries(response: Ga4RunReportResponse): TimeSeriesPoint[] {
  return ga4Rows(response)
    .map((row) => {
      const rawDate = dimension(row, response, "date", 0);
      const value = metricNumber(row, response, "sessions", 0);
      if (!rawDate || value === undefined) return undefined;
      return { date: ga4DateToIso(rawDate), value };
    })
    .filter(isDefined);
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

function channelMetric(
  locale: GoogleReportLocale,
  channel: string,
  value: number | undefined,
  previousValue: number | undefined,
  trendGoodKey: keyof typeof TREND_GOOD_WHEN_UP,
): Metric | undefined {
  if (value === undefined) return undefined;

  return createMetric({
    value,
    previousValue,
    unit: "number",
    label: label(locale, channel),
    trendGoodKey,
  });
}

function createMetric(params: {
  value: number;
  previousValue?: number;
  unit: MetricUnit;
  label: string;
  trendGoodKey: keyof typeof TREND_GOOD_WHEN_UP;
}): Metric {
  return {
    value: params.value,
    previousValue: params.previousValue,
    unit: params.unit,
    label: params.label,
    trend:
      params.previousValue === undefined
        ? undefined
        : trendFor(params.value, params.previousValue),
    trendGood: TREND_GOOD_WHEN_UP[params.trendGoodKey],
  };
}

function ga4SourceConfidence(
  current: Ga4ResponseSet,
  prior: Ga4ResponseSet,
  syncedAt = new Date().toISOString(),
): NonNullable<PartialReportData["sourceConfidence"]>[string] {
  const coverage = ga4SamplingCoverage([
    ...Object.values(current),
    ...Object.values(prior),
  ]);

  return {
    connected: true,
    lastSync: syncedAt,
    coverage,
  };
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

function ga4SamplingCoverage(responses: Ga4RunReportResponse[]): number {
  const ratios = responses.flatMap((response) =>
    (response.metadata?.samplingMetadatas ?? [])
      .map((metadata) => {
        const read = Number(metadata.samplesReadCount);
        const space = Number(metadata.samplingSpaceSize);
        if (!read || !space) return undefined;
        return read / space;
      })
      .filter(isDefined),
  );

  if (ratios.length === 0) return 1;
  return round(Math.max(0, Math.min(1, ...ratios)));
}

function trendFor(currentValue: number, previousValue: number): MetricTrend {
  if (currentValue > previousValue) return "up";
  if (currentValue < previousValue) return "down";
  return "flat";
}

function label(locale: GoogleReportLocale, key: string): string {
  const labels: Record<string, string> = LABELS[locale];
  return labels[key] ?? key;
}

function ga4Rows(response: Ga4RunReportResponse) {
  return response.rows ?? [];
}

function gscRows(response: GscSearchAnalyticsResponse): GscSearchAnalyticsRow[] {
  return response.rows ?? [];
}

function dimension(
  row: NonNullable<Ga4RunReportResponse["rows"]>[number],
  response: Ga4RunReportResponse,
  name: string,
  fallbackIndex: number,
): string | undefined {
  const index =
    response.dimensionHeaders?.findIndex((header) => header.name === name) ??
    fallbackIndex;
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return row.dimensionValues?.[resolvedIndex]?.value;
}

function metricNumber(
  row: NonNullable<Ga4RunReportResponse["rows"]>[number],
  response: Ga4RunReportResponse,
  name: string,
  fallbackIndex: number,
): number | undefined {
  const index =
    response.metricHeaders?.findIndex((header) => header.name === name) ??
    fallbackIndex;
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  const rawValue = row.metricValues?.[resolvedIndex]?.value;
  if (rawValue === undefined) return undefined;

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : undefined;
}

function ga4DateToIso(value: string): string {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  return value;
}

function pathFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function multiplyPercent(value: number | undefined): number | undefined {
  return value === undefined ? undefined : value * 100;
}

function safeNumber(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

type Ga4Summary = {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  bounceRate: number;
  engagementRate: number;
  averageSessionDuration: number;
  conversions: number;
  conversionRate: number;
};

type GscSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
