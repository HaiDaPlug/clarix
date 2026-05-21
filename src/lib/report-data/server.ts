import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GoogleApiError,
  fetchGa4ReportSet,
  fetchGscReportSet,
} from "@/lib/google/api-client";
import { assertDateRange, getPriorDateRange } from "@/lib/google/date-range";
import { mapGa4Report, mapGscReport } from "@/lib/google/report-mappers";
import {
  type ConnectableSource,
  type ConnectedSource,
  mergeReportData,
} from "@/lib/google/connected-sources";
import type { DateRange, GoogleReportLocale } from "@/lib/google/report-types";
import { getValidAccessToken } from "@/lib/google/token-refresh";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import type { ReportData } from "@/types/schema";

export type ReportDataBuildResult =
  | { status: "ok"; data: ReportData; sources: ConnectedSource[] }
  | { status: "no_sources"; data: null; sources: [] }
  | { status: "no_data"; data: null; sources: ConnectedSource[] };

export async function buildReportDataForUser({
  supabase,
  userId,
  dateRange,
  periodLabel,
  locale = "sv",
}: {
  supabase: SupabaseClient;
  userId: string;
  dateRange: DateRange;
  periodLabel: string;
  locale?: GoogleReportLocale;
}): Promise<ReportDataBuildResult> {
  const range = assertDateRange(dateRange);
  const { data, error } = await supabase
    .from("connected_sources")
    .select("id, source, property_id, display_name, token_expires_at")
    .eq("user_id", userId)
    .in("source", ["ga4", "gsc"])
    .neq("property_id", "_pending");

  if (error || !data?.length) {
    return { status: "no_sources", data: null, sources: [] };
  }

  const sources = data.filter(
    (source): source is ConnectedSource => source.source === "ga4" || source.source === "gsc",
  );

  if (sources.length === 0) {
    return { status: "no_sources", data: null, sources: [] };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const parts = await Promise.all(
    sources.map((source) =>
      fetchSourceReportPart({
        supabase,
        userId,
        source,
        dateRange: range,
        locale,
        sessionToken: sessionData.session?.provider_token ?? undefined,
      }),
    ),
  );

  const realParts = parts.filter((part): part is Partial<ReportData> => part !== undefined);
  if (realParts.length === 0) {
    return { status: "no_data", data: null, sources };
  }

  const successfulSourceIds = realParts
    .flatMap((part) => Object.keys(part.sourceConfidence ?? {}))
    .filter((source): source is ConnectableSource => source === "ga4" || source === "gsc");

  const base = createEmptyReportData({
    dateRange: range,
    periodLabel,
    availableSources: [],
  });

  const merged = mergeReportData(
    base,
    realParts,
    successfulSourceIds.length > 0 ? successfulSourceIds : sources.map((s) => s.source),
  );

  merged.meta = {
    ...merged.meta,
    period: {
      label: periodLabel,
      startDate: range.startDate,
      endDate: range.endDate,
    },
  };

  const hasMetrics = Boolean(merged.trafficOverview || merged.seoOverview);
  if (!hasMetrics) {
    return { status: "no_data", data: null, sources };
  }

  if (!merged.executiveSummary) {
    merged.executiveSummary = deriveExecutiveSummary(merged, locale);
  }

  return { status: "ok", data: merged, sources };
}

async function fetchSourceReportPart({
  supabase,
  userId,
  source,
  dateRange,
  locale,
  sessionToken,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: ConnectedSource;
  dateRange: DateRange;
  locale: GoogleReportLocale;
  sessionToken?: string;
}): Promise<Partial<ReportData> | undefined> {
  try {
    const accessToken = await getValidAccessToken(
      supabase,
      userId,
      source.source,
      source.property_id,
      sessionToken,
    );
    if (!accessToken) return undefined;

    const priorDateRange = getPriorDateRange(dateRange);
    if (source.source === "ga4") {
      const [current, prior] = await Promise.all([
        fetchGa4ReportSet({ accessToken, propertyId: source.property_id, dateRange }),
        fetchGa4ReportSet({ accessToken, propertyId: source.property_id, dateRange: priorDateRange }),
      ]);
      return mapGa4Report({ current, prior, dateRange, priorDateRange, locale });
    }

    const [current, prior] = await Promise.all([
      fetchGscReportSet({ accessToken, siteUrl: source.property_id, dateRange }),
      fetchGscReportSet({ accessToken, siteUrl: source.property_id, dateRange: priorDateRange }),
    ]);
    return mapGscReport({ current, prior, dateRange, priorDateRange, locale });
  } catch (error) {
    if (error instanceof GoogleApiError && (error.status === 401 || error.status === 403)) {
      return undefined;
    }
    if (error instanceof Error && error.message.startsWith("token_refresh_failed")) {
      return undefined;
    }
    return undefined;
  }
}

function createEmptyReportData({
  dateRange,
  periodLabel,
  availableSources,
}: {
  dateRange: DateRange;
  periodLabel: string;
  availableSources: ConnectableSource[];
}): ReportData {
  return {
    meta: {
      id: `report-${dateRange.startDate}-${dateRange.endDate}`,
      clientName: "Clarix",
      agencyName: "Clarix",
      reportType: "full",
      cadence: "monthly",
      period: {
        label: periodLabel,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      availableSources,
      generatedAt: new Date().toISOString(),
    },
  };
}
