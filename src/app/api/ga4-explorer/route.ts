import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleApiError } from "@/lib/google/api-client";
import { assertDateRange, getPriorDateRange } from "@/lib/google/date-range";
import { ga4Endpoint } from "@/lib/google/report-queries";
import { getValidAccessToken } from "@/lib/google/token-refresh";
import { createClient } from "@/utils/supabase/server";
import type { DateRange, Ga4RunReportResponse } from "@/lib/google/report-types";
import { ga4Rows, metricNumber, dimension } from "@/lib/google/mapper-utils";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  propertyId: z.string(),
  dateRange: z.object({ startDate: z.string(), endDate: z.string() }),
});

export type Ga4ExplorerMetric = {
  key: string;
  label: string;
  value: number | null;
  previousValue: number | null;
  unit: "number" | "percent" | "seconds" | "currency";
  trendGood: boolean;
};

export type Ga4ExplorerRow = {
  dimension: string;
  value: number | null;
  previousValue: number | null;
};

export type Ga4ExplorerData = {
  connected: boolean;
  overview: Ga4ExplorerMetric[];
  devices: Ga4ExplorerRow[];
  countries: Ga4ExplorerRow[];
  channels: Ga4ExplorerRow[];
  landingPages: Ga4ExplorerRow[];
  events: Ga4ExplorerRow[];
  topPages: Ga4ExplorerRow[];
};

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { propertyId, dateRange: rawRange } = parsed.data;
    const dateRange = assertDateRange(rawRange);
    const priorRange = getPriorDateRange(dateRange);

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const accessToken = await getValidAccessToken(
      supabase, user.id, "ga4", propertyId, session?.provider_token ?? undefined,
    );

    if (!accessToken) {
      return NextResponse.json({ connected: false } satisfies Partial<Ga4ExplorerData>);
    }

    const endpoint = ga4Endpoint(propertyId);

    const [
      summary, priorSummary,
      devices, priorDevices,
      countries, priorCountries,
      channels, priorChannels,
      landingPages, priorLandingPages,
      events, priorEvents,
      topPages, priorTopPages,
    ] = await Promise.all([
      ga4Report(endpoint, accessToken, summaryRequest(dateRange)),
      ga4Report(endpoint, accessToken, summaryRequest(priorRange)),
      ga4Report(endpoint, accessToken, dimensionRequest(dateRange, "deviceCategory", "sessions")),
      ga4Report(endpoint, accessToken, dimensionRequest(priorRange, "deviceCategory", "sessions")),
      ga4Report(endpoint, accessToken, dimensionRequest(dateRange, "country", "sessions", 10)),
      ga4Report(endpoint, accessToken, dimensionRequest(priorRange, "country", "sessions", 10)),
      ga4Report(endpoint, accessToken, dimensionRequest(dateRange, "sessionDefaultChannelGroup", "sessions")),
      ga4Report(endpoint, accessToken, dimensionRequest(priorRange, "sessionDefaultChannelGroup", "sessions")),
      ga4Report(endpoint, accessToken, dimensionRequest(dateRange, "landingPage", "sessions", 10)),
      ga4Report(endpoint, accessToken, dimensionRequest(priorRange, "landingPage", "sessions", 10)),
      ga4Report(endpoint, accessToken, dimensionRequest(dateRange, "eventName", "eventCount", 15)),
      ga4Report(endpoint, accessToken, dimensionRequest(priorRange, "eventName", "eventCount", 15)),
      ga4Report(endpoint, accessToken, topPagesRequest(dateRange)),
      ga4Report(endpoint, accessToken, topPagesRequest(priorRange)),
    ]);

    const row0 = ga4Rows(summary)[0];
    const priorRow0 = ga4Rows(priorSummary)[0];

    const overviewMetrics: Ga4ExplorerMetric[] = [
      metric("sessions", "Totala sessioner", row0, summary, priorRow0, priorSummary, "number", true),
      metric("totalUsers", "Användare", row0, summary, priorRow0, priorSummary, "number", true),
      metric("newUsers", "Nya användare", row0, summary, priorRow0, priorSummary, "number", true),
      metric("screenPageViews", "Sidvisningar", row0, summary, priorRow0, priorSummary, "number", true),
      metric("engagementRate", "Engagemangsgrad", row0, summary, priorRow0, priorSummary, "percent", true),
      metric("bounceRate", "Avvisningsfrekvens", row0, summary, priorRow0, priorSummary, "percent", false),
      metric("averageSessionDuration", "Genomsn. besökstid", row0, summary, priorRow0, priorSummary, "seconds", true),
      metric("conversions", "Konverteringar", row0, summary, priorRow0, priorSummary, "number", true),
      metric("sessionConversionRate", "Konverteringsgrad", row0, summary, priorRow0, priorSummary, "percent", true),
      metric("userEngagementDuration", "Engagemangstid", row0, summary, priorRow0, priorSummary, "seconds", true),
    ];

    return NextResponse.json({
      connected: true,
      overview: overviewMetrics,
      devices: toRows(devices, priorDevices, "deviceCategory", "sessions"),
      countries: toRows(countries, priorCountries, "country", "sessions"),
      channels: toRows(channels, priorChannels, "sessionDefaultChannelGroup", "sessions"),
      landingPages: toRows(landingPages, priorLandingPages, "landingPage", "sessions"),
      events: toRows(events, priorEvents, "eventName", "eventCount"),
      topPages: toRows(topPages, priorTopPages, "pagePath", "screenPageViews"),
    } satisfies Ga4ExplorerData);
  } catch (error) {
    if (error instanceof GoogleApiError) {
      const isAuth = error.status === 401 || error.status === 403;
      return NextResponse.json(
        { error: isAuth ? "Not authorized." : "GA4 fetch failed." },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

function summaryRequest(dateRange: DateRange) {
  return {
    dateRanges: [dateRange],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "screenPageViews" },
      { name: "engagementRate" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
      { name: "sessionConversionRate" },
      { name: "userEngagementDuration" },
    ],
  };
}

function dimensionRequest(dateRange: DateRange, dim: string, metricName: string, limit = 20) {
  return {
    dateRanges: [dateRange],
    dimensions: [{ name: dim }],
    metrics: [{ name: metricName }],
    orderBys: [{ metric: { metricName: metricName }, desc: true }],
    limit,
  };
}

function topPagesRequest(dateRange: DateRange) {
  return {
    dateRanges: [dateRange],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  };
}

async function ga4Report(endpoint: string, accessToken: string, body: unknown): Promise<Ga4RunReportResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleApiError(`GA4 ${res.status}`, res.status, text);
  }
  return res.json();
}

type Ga4Row = NonNullable<Ga4RunReportResponse["rows"]>[number];

function metric(
  name: string,
  label: string,
  row: Ga4Row | undefined,
  response: Ga4RunReportResponse,
  priorRow: Ga4Row | undefined,
  priorResponse: Ga4RunReportResponse,
  unit: Ga4ExplorerMetric["unit"],
  trendGood: boolean,
): Ga4ExplorerMetric {
  const raw = row ? metricNumber(row, response, name, -1) ?? null : null;
  const prior = priorRow ? metricNumber(priorRow, priorResponse, name, -1) ?? null : null;
  const value = raw !== null && (unit === "percent") ? raw * 100 : raw;
  const previousValue = prior !== null && (unit === "percent") ? prior * 100 : prior;
  return { key: name, label, value, previousValue, unit, trendGood };
}

function toRows(
  current: Ga4RunReportResponse,
  prior: Ga4RunReportResponse,
  dimName: string,
  metricName: string,
): Ga4ExplorerRow[] {
  const priorMap = new Map<string, number>();
  for (const row of ga4Rows(prior)) {
    const dim = dimension(row, prior, dimName, 0);
    const val = metricNumber(row, prior, metricName, 0);
    if (dim && val !== undefined) priorMap.set(dim, val);
  }

  return ga4Rows(current).map((row) => {
    const dim = dimension(row, current, dimName, 0);
    const val = metricNumber(row, current, metricName, 0);
    return {
      dimension: dim ?? "—",
      value: val ?? null,
      previousValue: dim ? (priorMap.get(dim) ?? null) : null,
    };
  });
}
