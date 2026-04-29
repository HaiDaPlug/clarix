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

export async function fetchGa4ReportSet(params: {
  accessToken: string;
  propertyId: string;
  dateRange: DateRange;
}): Promise<Ga4ResponseSet> {
  const endpoint = ga4Endpoint(params.propertyId);
  const [summary, channels, timeSeries, topPages] = await Promise.all([
    postGoogleJson<Ga4RunReportResponse>(
      endpoint,
      params.accessToken,
      buildGa4SummaryRequest(params.dateRange),
    ),
    postGoogleJson<Ga4RunReportResponse>(
      endpoint,
      params.accessToken,
      buildGa4ChannelRequest(params.dateRange),
    ),
    postGoogleJson<Ga4RunReportResponse>(
      endpoint,
      params.accessToken,
      buildGa4TimeSeriesRequest(params.dateRange),
    ),
    postGoogleJson<Ga4RunReportResponse>(
      endpoint,
      params.accessToken,
      buildGa4TopPagesRequest(params.dateRange),
    ),
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
