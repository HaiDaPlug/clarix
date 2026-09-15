// Builds ReportData for ONE workspace the caller names explicitly, and only
// that one.
//
// This is the one place that decides which Google properties a report is
// built from. Dashboard, report viewer, AI insights and share links all call
// it with a `clientId`, which must belong to the signed-in user. The user's
// "active" workspace is a navigation preference resolved by the pages before
// they ask for data; it is never substituted here, so a request can never
// come back with a different customer's numbers than it asked for.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GoogleApiError,
  fetchGa4ReportSet,
  fetchGa4TopHostname,
  fetchGscReportSet,
} from "@/lib/google/api-client";
import { assertDateRange, getPriorDateRange } from "@/lib/google/date-range";
import { mapGa4Report, mapGscReport } from "@/lib/google/report-mappers";
import { type ConnectableSource, mergeReportData } from "@/lib/google/connected-sources";
import { readReportCache, writeReportCache } from "@/lib/google/report-cache";
import type { DateRange, GoogleReportLocale } from "@/lib/google/report-types";
import {
  type ConnectionDeps,
  type GoogleConnectionHealth,
  type GoogleConnectionStore,
  getGoogleAccessToken,
  getGoogleConnectionStore,
  markGoogleReconnectRequired,
} from "@/lib/google/connection";
import { ClientNotFoundError, getClientById } from "@/lib/clients/server";
import { domainFromGscSiteUrl, domainFromUrl } from "@/lib/clients/naming";
import type { ClientWorkspace } from "@/lib/clients/types";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import type { ReportData } from "@/types/schema";

export type ReportSourceRef = {
  source: ConnectableSource;
  propertyId: string;
  displayName: string | null;
};

export type WorkspaceSummary = Pick<ClientWorkspace, "id" | "name" | "domain">;

// Reason categories surfaced to the UI and logs so we can diagnose without guessing.
export type SourceFailReason =
  | "google_401"
  | "google_403"
  | "google_5xx"
  | "google_unavailable"
  | "unknown";

export type ReportSourceFailure = {
  source: ConnectableSource;
  propertyId: string;
  reason: SourceFailReason;
  detail?: string;
};

export type ReportDataBuildResult =
  | {
      status: "ok";
      data: ReportData;
      workspace: WorkspaceSummary;
      sources: ReportSourceRef[];
      failures: ReportSourceFailure[];
      google: GoogleConnectionHealth;
    }
  | {
      /** The workspace has no GA4/GSC property assigned. */
      status: "no_sources";
      data: null;
      workspace: WorkspaceSummary;
      sources: [];
      failures: [];
      google: GoogleConnectionHealth;
    }
  | {
      /** The Google grant is missing or permanently rejected. One re-auth fixes it. */
      status: "reconnect_required";
      data: null;
      workspace: WorkspaceSummary;
      sources: ReportSourceRef[];
      failures: [];
      google: GoogleConnectionHealth;
    }
  | {
      /** Google or the server could not be reached right now. Nothing is wrong with the grant. */
      status: "unavailable";
      data: null;
      workspace: WorkspaceSummary;
      sources: ReportSourceRef[];
      failures: ReportSourceFailure[];
      google: GoogleConnectionHealth;
    }
  | {
      /** The grant works, but every source failed or returned nothing for this range. */
      status: "no_data";
      data: null;
      workspace: WorkspaceSummary;
      sources: ReportSourceRef[];
      failures: ReportSourceFailure[];
      google: GoogleConnectionHealth;
    };

type SourceResult =
  | { ok: true; source: ReportSourceRef; part: Partial<ReportData>; hostname: string | null }
  | { ok: false; source: ReportSourceRef; reason: SourceFailReason; detail?: string };

/**
 * @throws ClientNotFoundError when `clientId` is not one of the user's
 *         workspaces. Routes turn that into a 404; nothing is substituted.
 */
export async function buildReportDataForUser({
  supabase,
  userId,
  clientId,
  dateRange,
  periodLabel,
  locale = "sv",
  caller = "unknown",
  googleStore,
  connectionDeps,
}: {
  supabase: SupabaseClient;
  userId: string;
  /** The workspace to build for. Required — there is no implicit default. */
  clientId: string;
  dateRange: DateRange;
  periodLabel: string;
  locale?: GoogleReportLocale;
  caller?: string;
  /** Test seam. Defaults to the service-role backed store. */
  googleStore?: GoogleConnectionStore | null;
  /** Test seam. Defaults to real Google refresh calls. */
  connectionDeps?: ConnectionDeps;
}): Promise<ReportDataBuildResult> {
  const range = assertDateRange(dateRange);
  const logCtx = {
    caller,
    userId: userId.slice(0, 8),
    client: clientId.slice(0, 8),
    period: `${range.startDate}..${range.endDate}`,
  };
  const store = googleStore === undefined ? getGoogleConnectionStore() : googleStore;

  const [workspace, token] = await Promise.all([
    getClientById(supabase, userId, clientId),
    getGoogleAccessToken(store, userId, { deps: connectionDeps }),
  ]);

  if (!workspace) {
    console.warn("[buildReportData] client_not_found", logCtx);
    throw new ClientNotFoundError();
  }

  const summary: WorkspaceSummary = { id: workspace.id, name: workspace.name, domain: workspace.domain };
  const sources = sourceRefs(workspace);

  if (sources.length === 0) {
    console.log("[buildReportData] no_sources", { ...logCtx, workspace: workspace.id });
    return { status: "no_sources", data: null, workspace: summary, sources: [], failures: [], google: token.health };
  }

  if (!token.ok) {
    if (token.health.status === "error") {
      console.warn("[buildReportData] unavailable", { ...logCtx, reason: token.health.reason });
      return {
        status: "unavailable",
        data: null,
        workspace: summary,
        sources,
        failures: sources.map((s) => ({ source: s.source, propertyId: s.propertyId, reason: "google_unavailable" as const })),
        google: token.health,
      };
    }
    console.warn("[buildReportData] reconnect_required", { ...logCtx, reason: token.health.reason });
    return { status: "reconnect_required", data: null, workspace: summary, sources, failures: [], google: token.health };
  }

  console.log("[buildReportData] fetching", {
    ...logCtx,
    workspace: workspace.id,
    sources: sources.map((s) => ({ source: s.source, property_id: s.propertyId })),
  });

  // Shared across the parallel source fetches so a 401 on both sources
  // triggers ONE forced refresh (the connection module de-duplicates too).
  let latestHealth = token.health;
  let grantRejected = false;
  const needsHostname = !workspace.domain && !workspace.sources.gsc;

  const fetchWithRetry = async (source: ReportSourceRef): Promise<SourceResult> => {
    const first = await fetchSourceReportPart({ supabase, userId, accessToken: token.accessToken, source, dateRange: range, locale, wantHostname: needsHostname });
    if (first.ok || first.reason !== "google_401") return first;

    // Google rejected a token we believed valid (revoked mid-hour, or the
    // access token was minted by a grant that has since died). Prove the
    // grant with a forced refresh, then try exactly once more.
    const refreshed = await getGoogleAccessToken(store, userId, { forceRefresh: true, deps: connectionDeps });
    latestHealth = refreshed.health;
    if (!refreshed.ok) {
      if (refreshed.health.status === "reconnect_required") grantRejected = true;
      return first;
    }

    const second = await fetchSourceReportPart({ supabase, userId, accessToken: refreshed.accessToken, source, dateRange: range, locale, wantHostname: needsHostname });
    if (!second.ok && second.reason === "google_401" && store) {
      // A brand-new access token was rejected too: the grant is dead in a way
      // the token endpoint did not report. Say so, once.
      grantRejected = true;
      await markGoogleReconnectRequired(store, userId, "invalid_grant", "google_401_after_refresh");
      latestHealth = (await getGoogleAccessToken(store, userId, { deps: connectionDeps })).health;
    }
    return second;
  };

  const results: SourceResult[] = await Promise.all(sources.map(fetchWithRetry));

  const successes = results.filter((r): r is Extract<SourceResult, { ok: true }> => r.ok);
  const failures: ReportSourceFailure[] = results
    .filter((r): r is Extract<SourceResult, { ok: false }> => !r.ok)
    .map((f) => ({ source: f.source.source, propertyId: f.source.propertyId, reason: f.reason, detail: f.detail }));

  if (failures.length > 0) {
    console.warn("[buildReportData] source failures", { ...logCtx, failures });
  }

  if (grantRejected) {
    return { status: "reconnect_required", data: null, workspace: summary, sources, failures: [], google: latestHealth };
  }

  if (successes.length === 0) {
    const allTemporary = failures.every((f) => f.reason === "google_5xx" || f.reason === "google_unavailable");
    if (allTemporary) {
      console.warn("[buildReportData] unavailable: every source failed transiently", logCtx);
      return { status: "unavailable", data: null, workspace: summary, sources, failures, google: latestHealth };
    }
    console.warn("[buildReportData] no_data: all sources failed", { ...logCtx, reasons: failures.map((f) => f.reason) });
    return { status: "no_data", data: null, workspace: summary, sources, failures, google: latestHealth };
  }

  const realParts = successes.map((r) => r.part);
  const successfulSourceIds = successes.map((r) => r.source.source);

  const base = createEmptyReportData({ dateRange: range, periodLabel, availableSources: [] });
  const merged = mergeReportData(base, realParts, successfulSourceIds);

  const gscRef = workspace.sources.gsc;
  const hostname = successes.find((s) => s.hostname)?.hostname ?? null;
  const clientDomain =
    workspace.domain ??
    (gscRef ? domainFromGscSiteUrl(gscRef.propertyId) : null) ??
    (hostname ? domainFromUrl(hostname) : null);

  merged.meta = {
    ...merged.meta,
    clientName: workspace.name,
    ...(clientDomain ? { clientDomain } : {}),
    period: { label: periodLabel, startDate: range.startDate, endDate: range.endDate },
  };

  const hasMetrics = Boolean(merged.trafficOverview || merged.seoOverview);
  if (!hasMetrics) {
    console.warn("[buildReportData] no_data: merge produced no trafficOverview or seoOverview", logCtx);
    return { status: "no_data", data: null, workspace: summary, sources, failures, google: latestHealth };
  }

  if (!merged.executiveSummary) {
    merged.executiveSummary = deriveExecutiveSummary(merged, locale);
  }

  console.log("[buildReportData] ok", {
    ...logCtx,
    workspace: workspace.id,
    successfulSources: successfulSourceIds,
    hasSeo: Boolean(merged.seoOverview),
    hasTraffic: Boolean(merged.trafficOverview),
  });

  return { status: "ok", data: merged, workspace: summary, sources, failures, google: latestHealth };
}

/** The GA4/GSC refs of a workspace, in a stable order. Exported for tests. */
export function sourceRefs(workspace: ClientWorkspace): ReportSourceRef[] {
  const refs: ReportSourceRef[] = [];
  const ga4 = workspace.sources.ga4;
  const gsc = workspace.sources.gsc;
  if (ga4) refs.push({ source: "ga4", propertyId: ga4.propertyId, displayName: ga4.displayName });
  if (gsc) refs.push({ source: "gsc", propertyId: gsc.propertyId, displayName: gsc.displayName });
  return refs;
}

async function fetchSourceReportPart({
  supabase,
  userId,
  accessToken,
  source,
  dateRange,
  locale,
  wantHostname,
}: {
  supabase: SupabaseClient;
  userId: string;
  accessToken: string;
  source: ReportSourceRef;
  dateRange: DateRange;
  locale: GoogleReportLocale;
  wantHostname: boolean;
}): Promise<SourceResult> {
  // Cached payloads are locale-dependent but keyed without locale, so only
  // the default "sv" locale goes through the cache.
  const cacheKey = { userId, source: source.source, propertyId: source.propertyId, dateRange };
  const useCache = locale === "sv";

  if (useCache) {
    const cached = await readReportCache(supabase, cacheKey);
    if (cached) {
      const { __hostname, ...part } = cached as Partial<ReportData> & { __hostname?: string | null };
      return { ok: true, source, part, hostname: __hostname ?? null };
    }
  }

  try {
    const priorDateRange = getPriorDateRange(dateRange);
    let part: Partial<ReportData>;
    let hostname: string | null = null;

    if (source.source === "ga4") {
      const [current, prior, topHostname] = await Promise.all([
        fetchGa4ReportSet({ accessToken, propertyId: source.propertyId, dateRange }),
        fetchGa4ReportSet({ accessToken, propertyId: source.propertyId, dateRange: priorDateRange }),
        wantHostname ? fetchGa4TopHostname({ accessToken, propertyId: source.propertyId, dateRange }) : Promise.resolve(null),
      ]);
      part = mapGa4Report({ current, prior, dateRange, priorDateRange, locale });
      hostname = topHostname;
    } else {
      const [current, prior] = await Promise.all([
        fetchGscReportSet({ accessToken, siteUrl: source.propertyId, dateRange }),
        fetchGscReportSet({ accessToken, siteUrl: source.propertyId, dateRange: priorDateRange }),
      ]);
      part = mapGscReport({ current, prior, dateRange, priorDateRange, locale });
    }

    if (useCache) {
      await writeReportCache(supabase, cacheKey, { ...part, __hostname: hostname } as Record<string, unknown>);
    }
    return { ok: true, source, part, hostname };
  } catch (error) {
    if (error instanceof GoogleApiError) {
      const reason: SourceFailReason =
        error.status === 401 ? "google_401" :
        error.status === 403 ? "google_403" :
        error.status >= 500 ? "google_5xx" :
        "unknown";
      return { ok: false, source, reason, detail: `HTTP ${error.status}` };
    }
    const detail = error instanceof Error ? error.message : String(error);
    const isNetwork = error instanceof TypeError || /fetch failed|ECONN|ETIMEDOUT|ENOTFOUND/i.test(detail);
    return { ok: false, source, reason: isNetwork ? "google_unavailable" : "unknown", detail };
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
