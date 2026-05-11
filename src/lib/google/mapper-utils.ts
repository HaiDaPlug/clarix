import type { Metric } from "@/types/schema";
import type { GoogleReportLocale } from "./report-types";

export type MetricTrend = "up" | "down" | "flat";
export type MetricUnit = Metric["unit"];

export const LABELS = {
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
    "Organic Social": "Organic Social",
    "Organic Video": "Organic Video",
    "Organic Shopping": "Organic Shopping",
    "Paid Shopping": "Paid Shopping",
    "Paid Video": "Paid Video",
    "Paid Other": "Paid Other",
    Email: "Email",
    Affiliates: "Affiliates",
    Audio: "Audio",
    "Display Ads": "Display Ads",
    SMS: "SMS",
    Unassigned: "Unassigned",
    "(Other)": "Other",
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
    "Organic Social": "Organisk social",
    "Organic Video": "Organisk video",
    "Organic Shopping": "Organisk shopping",
    "Paid Shopping": "Betald shopping",
    "Paid Video": "Betald video",
    "Paid Other": "Betald övrigt",
    Email: "E-post",
    Affiliates: "Affiliates",
    Audio: "Ljud",
    "Display Ads": "Display-annonser",
    SMS: "SMS",
    Unassigned: "Ej tilldelad",
    "(Other)": "Övrigt",
    clicks: "Totala klick",
    impressions: "Totala visningar",
    ctr: "Genomsn. CTR",
    position: "Genomsn. position",
  },
} satisfies Record<GoogleReportLocale, Record<string, string>>;

export const TREND_GOOD_WHEN_UP = {
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

export function label(locale: GoogleReportLocale, key: string): string {
  const labels: Record<string, string> = LABELS[locale];
  return labels[key] ?? key;
}

export function createMetric(params: {
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

export function trendFor(currentValue: number, previousValue: number): MetricTrend {
  if (currentValue > previousValue) return "up";
  if (currentValue < previousValue) return "down";
  return "flat";
}

export function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function safeNumber(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function multiplyPercent(value: number | undefined): number | undefined {
  return value === undefined ? undefined : value * 100;
}

export function pathFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

export function ga4DateToIso(value: string): string {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

export function dimension(
  row: NonNullable<import("./report-types").Ga4RunReportResponse["rows"]>[number],
  response: import("./report-types").Ga4RunReportResponse,
  name: string,
  fallbackIndex: number,
): string | undefined {
  const index =
    response.dimensionHeaders?.findIndex((header) => header.name === name) ??
    fallbackIndex;
  const resolvedIndex = index >= 0 ? index : fallbackIndex;
  return row.dimensionValues?.[resolvedIndex]?.value;
}

export function metricNumber(
  row: NonNullable<import("./report-types").Ga4RunReportResponse["rows"]>[number],
  response: import("./report-types").Ga4RunReportResponse,
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

export function ga4Rows(response: import("./report-types").Ga4RunReportResponse) {
  return response.rows ?? [];
}

export function gscRows(
  response: import("./report-types").GscSearchAnalyticsResponse,
): import("./report-types").GscSearchAnalyticsRow[] {
  return response.rows ?? [];
}
