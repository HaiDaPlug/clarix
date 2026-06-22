import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleApiError, fetchGa4ReportSet } from "@/lib/google/api-client";
import { assertDateRange, getPriorDateRange } from "@/lib/google/date-range";
import { mapGa4Report } from "@/lib/google/report-mappers";
import type { DateRange } from "@/lib/google/report-types";
import { getValidAccessToken } from "@/lib/google/token-refresh";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  propertyId: z.string().optional(),
  ga4PropertyId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dateRange: z
    .object({
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
  locale: z.enum(["sv", "en"]).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation", message: "Invalid request body." } },
        { status: 400 },
      );
    }

    const propertyId = parsed.data.propertyId ?? parsed.data.ga4PropertyId;
    const dateRange = parseDateRange(parsed.data);
    const locale = parsed.data.locale ?? "sv";
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let accessToken: string | null = null;

    if (user && propertyId) {
      accessToken = await getValidAccessToken(supabase, user.id, "ga4", propertyId);
    }

    if (!propertyId || !accessToken) {
      return NextResponse.json({
        sourceConfidence: { ga4: { connected: false } },
      });
    }

    const priorDateRange = getPriorDateRange(dateRange);
    const numericId = propertyId.trim().replace(/^properties\//, "");
    const dataEndpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${numericId}:runReport`;

    // Query hostname alongside report data — same auth scope, guaranteed to work
    const [current, prior, websiteUri] = await Promise.all([
      fetchGa4ReportSet({ accessToken, propertyId, dateRange }),
      fetchGa4ReportSet({ accessToken, propertyId, dateRange: priorDateRange }),
      fetch(dataEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dimensions: [{ name: "hostname" }],
          metrics: [{ name: "sessions" }],
          dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
          limit: 1,
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),
      }).then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json() as { rows?: { dimensionValues?: { value?: string }[] }[] };
        return data.rows?.[0]?.dimensionValues?.[0]?.value ?? null;
      }).catch(() => null),
    ]);

    let mapped: ReturnType<typeof mapGa4Report>;
    try {
      mapped = mapGa4Report({ current, prior, dateRange, priorDateRange, locale });
    } catch {
      return NextResponse.json(
        { error: { type: "data", message: "Google Analytics response could not be parsed." } },
        { status: 502 },
      );
    }
    return NextResponse.json({ ...mapped, websiteUri });
  } catch (error) {
    return googleRouteError(error, "ga4");
  }
}

function parseDateRange(input: z.infer<typeof requestSchema>): DateRange {
  const range = input.dateRange ?? {
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
  };

  return assertDateRange(range);
}

function googleRouteError(error: unknown, source: "ga4") {
  if (error instanceof GoogleApiError) {
    const type =
      error.status === 401 || error.status === 403 ? "connection" : "data";

    return NextResponse.json(
      {
        error: {
          type,
          message: type === "connection"
            ? "Google Analytics connection is not authorized for this property."
            : "Google Analytics data could not be fetched.",
          status: error.status,
        },
        sourceConfidence: { [source]: { connected: type !== "connection" } },
      },
      { status: error.status },
    );
  }

  if (error instanceof Error && error.message.startsWith("token_refresh_failed")) {
    return NextResponse.json(
      {
        error: {
          type: "connection",
          message: "Google Analytics token has expired. Please reconnect your account.",
        },
        sourceConfidence: { [source]: { connected: false } },
      },
      { status: 401 },
    );
  }

  const message =
    error instanceof Error ? error.message : "Google Analytics request failed.";
  return NextResponse.json(
    { error: { type: "data", message } },
    { status: 500 },
  );
}
