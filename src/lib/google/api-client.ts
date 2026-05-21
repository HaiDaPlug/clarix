import type {
  DateRange,
  Ga4ResponseSet,
  Ga4RunReportResponse,
  GscResponseSet,
  GscSearchAnalyticsResponse,
} from "./report-types";
import {
  buildGa4ChannelRequest,
  buildGa4SummaryRequest,
  buildGa4TimeSeriesRequest,
  buildGa4TopPagesRequest,
  buildGscSummaryRequest,
  buildGscTimeSeriesRequest,
  buildGscTopPagesRequest,
  buildGscTopQueriesRequest,
  ga4Endpoint,
  gscEndpoint,
} from "./report-queries";

export class GoogleApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

const EMPTY_GA4_RESPONSE: Ga4RunReportResponse = {};

/** Fetch one optional GA4 sub-report; return an empty response on any error
 *  so a single failing dimension request doesn't kill the whole report set. */
async function fetchGa4Optional(
  endpoint: string,
  accessToken: string,
  body: unknown,
): Promise<Ga4RunReportResponse> {
  try {
    return await postGoogleJson<Ga4RunReportResponse>(endpoint, accessToken, body);
  } catch (err) {
    // Re-throw auth errors — those mean the whole token is dead.
    if (err instanceof GoogleApiError && (err.status === 401 || err.status === 403)) {
      throw err;
    }
    return EMPTY_GA4_RESPONSE;
  }
}

export async function fetchGa4ReportSet(params: {
  accessToken: string;
  propertyId: string;
  dateRange: DateRange;
}): Promise<Ga4ResponseSet> {
  const endpoint = ga4Endpoint(params.propertyId);

  // summary is required — let it throw if it fails.
  // channels, timeSeries, and topPages are optional: a failure returns an empty
  // response so the report still shows core session/bounce metrics.
  const [summary, channels, timeSeries, topPages] = await Promise.all([
    postGoogleJson<Ga4RunReportResponse>(
      endpoint,
      params.accessToken,
      buildGa4SummaryRequest(params.dateRange),
    ),
    fetchGa4Optional(endpoint, params.accessToken, buildGa4ChannelRequest(params.dateRange)),
    fetchGa4Optional(endpoint, params.accessToken, buildGa4TimeSeriesRequest(params.dateRange)),
    fetchGa4Optional(endpoint, params.accessToken, buildGa4TopPagesRequest(params.dateRange)),
  ]);

  return { summary, channels, timeSeries, topPages };
}

export async function fetchGscReportSet(params: {
  accessToken: string;
  siteUrl: string;
  dateRange: DateRange;
}): Promise<GscResponseSet> {
  const endpoint = gscEndpoint(params.siteUrl);
  const [summary, timeSeries, topQueries, topPages] = await Promise.all([
    postGoogleJson<GscSearchAnalyticsResponse>(
      endpoint,
      params.accessToken,
      buildGscSummaryRequest(params.dateRange),
    ),
    postGoogleJson<GscSearchAnalyticsResponse>(
      endpoint,
      params.accessToken,
      buildGscTimeSeriesRequest(params.dateRange),
    ),
    postGoogleJson<GscSearchAnalyticsResponse>(
      endpoint,
      params.accessToken,
      buildGscTopQueriesRequest(params.dateRange),
    ),
    postGoogleJson<GscSearchAnalyticsResponse>(
      endpoint,
      params.accessToken,
      buildGscTopPagesRequest(params.dateRange),
    ),
  ]);

  return { summary, timeSeries, topQueries, topPages };
}

async function postGoogleJson<T>(
  url: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  return withRetry(() => postGoogleJsonOnce<T>(url, accessToken, body));
}

async function postGoogleJsonOnce<T>(
  url: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new GoogleApiError(
      `Google API request failed with ${response.status}.`,
      response.status,
      responseBody,
    );
  }

  return response.json() as Promise<T>;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const isPermanent =
        err instanceof GoogleApiError &&
        (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404);
      if (isPermanent || i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("unreachable");
}
