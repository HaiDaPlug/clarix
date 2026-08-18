import type {
  Conversion,
  KpiSnapshot,
  Metric,
  TimeSeriesPoint,
  TopPages,
  TrafficOverview,
} from "@/types/schema";
import { formatPeriod } from "./date-range";
import type {
  DateRange,
  Ga4ResponseSet,
  Ga4RunReportResponse,
  GoogleReportLocale,
  PartialReportData,
} from "./report-types";
import {
  createMetric,
  dimension,
  ga4DateToIso,
  ga4Rows,
  isDefined,
  label,
  metricNumber,
  multiplyPercent,
  round,
  trendFor,
  TREND_GOOD_WHEN_UP,
} from "./mapper-utils";

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
  const paidSocialBySource = readPaidSocialBySource(params.current.paidSocial);
  const priorPaidSocialBySource = readPaidSocialBySource(params.prior.paidSocial);

  const channelBreakdown =
    channels.rows.length > 0
      ? channels.rows.map((row) => ({
          channel: label(params.locale, row.channel),
          sessions: row.sessions,
          previousSessions: priorChannels.byName.get(row.channel),
          share: channels.totalSessions
            ? round((row.sessions / channels.totalSessions) * 100)
            : 0,
          subChannels:
            row.channel === PAID_SOCIAL_CHANNEL
              ? mapPaidSocialSubChannels(paidSocialBySource, priorPaidSocialBySource)
              : undefined,
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
    engagementRate: createMetric({
      value: summary.engagementRate * 100,
      previousValue:
        priorSummary === undefined ? undefined : priorSummary.engagementRate * 100,
      unit: "percent",
      label: label(params.locale, "engagementRate"),
      trendGoodKey: "engagementRate",
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

function mapGa4TopPages(
  current: Ga4RunReportResponse,
  prior: Ga4RunReportResponse,
): TopPages {
  const priorSessionsByPath = new Map(
    ga4Rows(prior)
      .map(
        (row) =>
          [
            dimension(row, prior, "pagePath", 0),
            metricNumber(row, prior, "sessions", 0),
          ] as const,
      )
      .filter(
        (entry): entry is readonly [string, number] =>
          Boolean(entry[0]) && entry[1] !== undefined,
      ),
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
          previousSessions,
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
    conversionRate: metricNumber(row, response, "sessionConversionRate", 7) ?? 0,
  };
}

const PAID_SOCIAL_CHANNEL = "Paid Social";

/** Named networks shown individually; everything else rolls into OTHER_SOURCE. */
const MAX_NAMED_SUB_CHANNELS = 4;
export const OTHER_SOURCE = "other";

/** GA4 reports whatever utm_source the advertiser set, so one network arrives
 *  under many spellings — "facebook", "Facebook", "m.facebook.com", "fb". Left
 *  raw these become separate rows that split one network's sessions in two and
 *  collide on display name in the UI. Collapse to a canonical key here, where
 *  sessions are summed, rather than downstream where they are only labelled. */
const SOURCE_ALIASES: Record<string, string> = {
  facebook: "facebook", "facebook.com": "facebook", "m.facebook.com": "facebook",
  "l.facebook.com": "facebook", "lm.facebook.com": "facebook", fb: "facebook",
  "fb.com": "facebook", meta: "facebook", "business.facebook.com": "facebook",
  instagram: "instagram", "instagram.com": "instagram", "l.instagram.com": "instagram", ig: "instagram",
  linkedin: "linkedin", "linkedin.com": "linkedin", "lnkd.in": "linkedin", "l.linkedin.com": "linkedin",
  tiktok: "tiktok", "tiktok.com": "tiktok", "ads.tiktok.com": "tiktok", "vm.tiktok.com": "tiktok",
  snapchat: "snapchat", "snapchat.com": "snapchat",
  pinterest: "pinterest", "pinterest.com": "pinterest",
  twitter: "x", "twitter.com": "x", "t.co": "x", x: "x", "x.com": "x",
  youtube: "youtube", "youtube.com": "youtube", "m.youtube.com": "youtube",
  reddit: "reddit", "reddit.com": "reddit",
};

export function normalizeSource(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/^www\./, "");
  return SOURCE_ALIASES[cleaned] ?? cleaned;
}

/** Paid Social sessions by canonical source, newest period and prior. */
function readPaidSocialBySource(response: Ga4RunReportResponse): Map<string, number> {
  const bySource = new Map<string, number>();

  for (const row of ga4Rows(response)) {
    const rawSource = dimension(row, response, "sessionSource", 0);
    const sessions = metricNumber(row, response, "sessions", 0);
    if (!rawSource || sessions === undefined) continue;
    const source = normalizeSource(rawSource);
    bySource.set(source, (bySource.get(source) ?? 0) + sessions);
  }

  return bySource;
}

function mapPaidSocialSubChannels(
  bySource: Map<string, number>,
  priorBySource: Map<string, number>,
): Array<{ source: string; sessions: number; previousSessions: number | undefined; share: number }> | undefined {
  if (bySource.size === 0) return undefined;

  const total = Array.from(bySource.values()).reduce((sum, sessions) => sum + sessions, 0);
  if (total <= 0) return undefined;

  const sorted = Array.from(bySource).sort((a, b) => b[1] - a[1]);
  const named = sorted.slice(0, MAX_NAMED_SUB_CHANNELS);
  const tail = sorted.slice(MAX_NAMED_SUB_CHANNELS);

  const toRow = (source: string, sessions: number, previousSessions: number | undefined) => ({
    source,
    sessions,
    previousSessions,
    share: round((sessions / total) * 100),
  });

  const rows = named.map(([source, sessions]) =>
    toRow(source, sessions, priorBySource.get(source)),
  );

  // Same honest-rollup rule the channel list uses: the long tail is merged
  // rather than dropped, so sub-channel shares still sum to 100%.
  if (tail.length > 0) {
    const tailSessions = tail.reduce((sum, [, sessions]) => sum + sessions, 0);
    const tailPrior = tail.reduce((sum, [source]) => sum + (priorBySource.get(source) ?? 0), 0);
    if (tailSessions > 0) {
      rows.push(toRow(OTHER_SOURCE, tailSessions, tailPrior > 0 ? tailPrior : undefined));
    }
  }

  return rows;
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
      const secondaryValue = metricNumber(row, response, "totalUsers", 1);
      return {
        date: ga4DateToIso(rawDate),
        value,
        ...(secondaryValue !== undefined ? { secondaryValue } : {}),
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
