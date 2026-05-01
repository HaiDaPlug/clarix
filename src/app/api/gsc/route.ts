import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleApiError, fetchGscReportSet } from "@/lib/google/api-client";
import { assertDateRange, getPriorDateRange } from "@/lib/google/date-range";
import { mapGscReport } from "@/lib/google/report-mappers";
import type { DateRange } from "@/lib/google/report-types";
import { getValidAccessToken } from "@/lib/google/token-refresh";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  siteUrl: z.string().optional(),
  gscSiteUrl: z.string().optional(),
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

    const siteUrl = parsed.data.siteUrl ?? parsed.data.gscSiteUrl;
    const dateRange = parseDateRange(parsed.data);
    const locale = parsed.data.locale ?? "sv";
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    let accessToken: string | null = null;

    if (session?.user && siteUrl) {
      accessToken = await getValidAccessToken(
        supabase,
        session.user.id,
        "gsc",
        siteUrl,
        session.provider_token ?? undefined,
      );
    }

    if (!siteUrl || !accessToken) {
      return NextResponse.json({
        sourceConfidence: { gsc: { connected: false } },
      });
    }

    const priorDateRange = getPriorDateRange(dateRange);
    const current = await fetchGscReportSet({
      accessToken,
      siteUrl,
      dateRange,
    });
    const prior = await fetchGscReportSet({
      accessToken,
      siteUrl,
      dateRange: priorDateRange,
    });

    return NextResponse.json(
      mapGscReport({
        current,
        prior,
        dateRange,
        priorDateRange,
        locale,
      }),
    );
  } catch (error) {
    return googleRouteError(error, "gsc");
  }
}

function parseDateRange(input: z.infer<typeof requestSchema>): DateRange {
  const range = input.dateRange ?? {
    startDate: input.startDate ?? "",
    endDate: input.endDate ?? "",
  };

  return assertDateRange(range);
}

function googleRouteError(error: unknown, source: "gsc") {
  if (error instanceof GoogleApiError) {
    const type =
      error.status === 401 || error.status === 403 ? "connection" : "data";

    return NextResponse.json(
      {
        error: {
          type,
          message: type === "connection"
            ? "Search Console connection is not verified for this site."
            : "Search Console data could not be fetched.",
          status: error.status,
        },
        sourceConfidence: { [source]: { connected: type !== "connection" } },
      },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Search Console request failed.";
  return NextResponse.json(
    { error: { type: "validation", message } },
    { status: 400 },
  );
}
