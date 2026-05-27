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

// Reason categories surfaced in logs so we can diagnose without guessing.
type SourceFailReason =
  | "token_missing"
  | "token_refresh_failed"
  | "google_401"
  | "google_403"
  | "google_5xx"
  | "unknown";

type SourceResult =
  | { ok: true; source: ConnectedSource; part: Partial<ReportData> }
  | { ok: false; source: ConnectedSource; reason: SourceFailReason; detail?: string };

export async function buildReportDataForUser({
  supabase,
  userId,
  dateRange,
  periodLabel,
  locale = "sv",
  caller = "unknown",
}: {
  supabase: SupabaseClient;
  userId: string;
  dateRange: DateRange;
  periodLabel: string;
  locale?: GoogleReportLocale;
  caller?: string;
}): Promise<ReportDataBuildResult> {
  const range = assertDateRange(dateRange);
  const logCtx = { caller, userId: userId.slice(0, 8), period: `${range.startDate}..${range.endDate}` };

  const { data, error: dbError } = await supabase
    .from("connected_sources")
    .select("id, source, property_id, display_name, token_expires_at")
    .eq("user_id", userId)
    .in("source", ["ga4", "gsc"])
    .neq("property_id", "_pending");

  if (dbError) {
    console.error("[buildReportData] connected_sources query failed", { ...logCtx, error: dbError.message });
    return { status: "no_sources", data: null, sources: [] };
  }

  if (!data?.length) {
    console.log("[buildReportData] no_sources: no connected rows", logCtx);
    return { status: "no_sources", data: null, sources: [] };
  }

  const sources = data.filter(
    (source): source is ConnectedSource => source.source === "ga4" || source.source === "gsc",
  );

  if (sources.length === 0) {
    console.log("[buildReportData] no_sources: rows exist but none are ga4/gsc", logCtx);
    return { status: "no_sources", data: null, sources: [] };
  }

  console.log("[buildReportData] fetching sources", {
    ...logCtx,
    sources: sources.map((s) => ({ source: s.source, property_id: s.property_id })),
  });

  const results: SourceResult[] = await Promise.all(
    sources.map((source) => fetchSourceReportPart({ supabase, userId, source, dateRange: range, locale })),
  );

  const successes = results.filter((r): r is Extract<SourceResult, { ok: true }> => r.ok);
  const failures = results.filter((r): r is Extract<SourceResult, { ok: false }> => !r.ok);

  if (failures.length > 0) {
    console.warn("[buildReportData] source failures", {
      ...logCtx,
      failures: failures.map((f) => ({
        source: f.source.source,
        property_id: f.source.property_id,
        reason: f.reason,
        detail: f.detail ?? null,
      })),
    });
  }

  const realParts = successes.map((r) => r.part);

  if (realParts.length === 0) {
    console.warn("[buildReportData] no_data: all sources failed", {
      ...logCtx,
      reasons: failures.map((f) => f.reason),
    });
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
    console.warn("[buildReportData] no_data: merge produced no trafficOverview or seoOverview", logCtx);
    return { status: "no_data", data: null, sources };
  }

  if (!merged.executiveSummary) {
    merged.executiveSummary = deriveExecutiveSummary(merged, locale);
  }

  console.log("[buildReportData] ok", {
    ...logCtx,
    successfulSources: successfulSourceIds,
    hasSeo: Boolean(merged.seoOverview),
    hasTraffic: Boolean(merged.trafficOverview),
    hasPaid: Boolean(merged.paidOverview),
  });

  return { status: "ok", data: merged, sources };
}

async function fetchSourceReportPart({
  supabase,
  userId,
  source,
  dateRange,
  locale,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: ConnectedSource;
  dateRange: DateRange;
  locale: GoogleReportLocale;
}): Promise<SourceResult> {
  const id = { source: source.source, property_id: source.property_id };

  let accessToken: string | null;
  try {
    accessToken = await getValidAccessToken(supabase, userId, source.source, source.property_id);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, source, reason: "token_refresh_failed", detail };
  }

  if (!accessToken) {
    console.warn("[fetchSourceReportPart] no token", id);
    return { ok: false, source, reason: "token_missing" };
  }

  try {
    const priorDateRange = getPriorDateRange(dateRange);
    if (source.source === "ga4") {
      const [current, prior] = await Promise.all([
        fetchGa4ReportSet({ accessToken, propertyId: source.property_id, dateRange }),
        fetchGa4ReportSet({ accessToken, propertyId: source.property_id, dateRange: priorDateRange }),
      ]);
      const part = mapGa4Report({ current, prior, dateRange, priorDateRange, locale });
      return { ok: true, source, part };
    }

    const [current, prior] = await Promise.all([
      fetchGscReportSet({ accessToken, siteUrl: source.property_id, dateRange }),
      fetchGscReportSet({ accessToken, siteUrl: source.property_id, dateRange: priorDateRange }),
    ]);
    const part = mapGscReport({ current, prior, dateRange, priorDateRange, locale });
    return { ok: true, source, part };
  } catch (error) {
    if (error instanceof GoogleApiError) {
      const reason: SourceFailReason =
        error.status === 401 ? "google_401" :
        error.status === 403 ? "google_403" :
        error.status >= 500 ? "google_5xx" :
        "unknown";
      return { ok: false, source, reason, detail: `HTTP ${error.status}` };
    }
    if (error instanceof Error && error.message.startsWith("token_refresh_failed")) {
      return { ok: false, source, reason: "token_refresh_failed", detail: error.message };
    }
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, source, reason: "unknown", detail };
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
