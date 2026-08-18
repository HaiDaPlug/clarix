import type { DateRange } from "./report-types";

export function normalizeGa4PropertyId(propertyId: string): string {
  const normalized = propertyId.trim().replace(/^properties\//, "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error("GA4 propertyId must be a numeric property ID.");
  }

  return normalized;
}

export function ga4Endpoint(propertyId: string): string {
  return `https://analyticsdata.googleapis.com/v1beta/properties/${normalizeGa4PropertyId(propertyId)}:runReport`;
}

export function gscEndpoint(siteUrl: string): string {
  const normalized = siteUrl.trim();
  if (!normalized) throw new Error("GSC siteUrl is required.");
  if (!isValidGscSiteUrl(normalized)) {
    throw new Error("GSC siteUrl must be a URL prefix or sc-domain property.");
  }

  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    normalized,
  )}/searchAnalytics/query`;
}

export function buildGa4SummaryRequest(dateRange: DateRange) {
  return {
    dateRanges: [dateRange],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "bounceRate" },
      { name: "engagementRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
      { name: "sessionConversionRate" },
    ],
  };
}

export function buildGa4ChannelRequest(dateRange: DateRange) {
  return {
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
  };
}

/** Paid Social sessions split by source, as its own filtered request.
 *
 *  Adding sessionSource to buildGa4ChannelRequest instead would look cheaper but
 *  changes that response from ~8 rows to one row per (channel × source) pair.
 *  sessionSource is high-cardinality — Referral alone routinely exceeds 100
 *  sources — so any row cap silently truncates the channel totals that
 *  organicSessions/paidSessions/directSessions/referralSessions and every share
 *  percentage are derived from. Keeping the split in a filtered query means those
 *  numbers stay on the low-cardinality response and cannot drift. */
export function buildGa4PaidSocialRequest(dateRange: DateRange) {
  return {
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionSource" }],
    metrics: [{ name: "sessions" }],
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { matchType: "EXACT", value: "Paid Social" },
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 25,
  };
}

export function buildGa4TimeSeriesRequest(dateRange: DateRange) {
  return {
    dateRanges: [dateRange],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
  };
}

export function buildGa4TopPagesRequest(dateRange: DateRange) {
  return {
    dateRanges: [dateRange],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [
      { name: "sessions" },
      { name: "bounceRate" },
      { name: "screenPageViews" },
    ],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  };
}

export function buildGscSummaryRequest(dateRange: DateRange) {
  return dateRange;
}

export function buildGscTimeSeriesRequest(dateRange: DateRange) {
  return {
    ...dateRange,
    dimensions: ["date"],
    rowLimit: 100,
  };
}

export function buildGscTopQueriesRequest(dateRange: DateRange) {
  return {
    ...dateRange,
    dimensions: ["query"],
    rowLimit: 10,
  };
}

export function buildGscTopPagesRequest(dateRange: DateRange) {
  return {
    ...dateRange,
    dimensions: ["page"],
    rowLimit: 10,
  };
}

function isValidGscSiteUrl(value: string): boolean {
  if (/^sc-domain:[a-z0-9.-]+$/i.test(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
