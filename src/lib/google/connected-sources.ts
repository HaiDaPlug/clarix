import type { DataSource, Metric, ReportData } from "@/types/schema";

export type ConnectableSource = "ga4" | "gsc";

export type ConnectedSource = {
  id: string;
  source: ConnectableSource;
  property_id: string;
  display_name: string | null;
  token_expires_at: string | null;
  needs_refresh?: boolean;
};

export type GooglePropertiesResponse = {
  ga4: Array<{ propertyId: string; displayName: string }>;
  gsc: Array<{ siteUrl: string; displayName: string }>;
  error?: {
    type: "auth" | "data";
    message: string;
  };
};

export function currentCalendarMonthRange(today = new Date()): {
  startDate: string;
  endDate: string;
} {
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastOfMonth = new Date(year, month + 1, 0);

  return {
    startDate: toLocalIsoDate(new Date(year, month, 1)),
    endDate: toLocalIsoDate(lastOfMonth < today ? lastOfMonth : today),
  };
}

export function mergeReportData(
  fallback: ReportData,
  parts: Array<Partial<ReportData> | undefined>,
  connectedSources: DataSource[],
): ReportData {
  const realParts = parts.filter((p): p is Partial<ReportData> => p !== undefined);

  const merged = realParts.reduce<ReportData>(
    (acc, part) => ({ ...acc, ...part }),
    fallback,
  );

  const availableSources = realParts.length > 0
    ? Array.from(new Set<DataSource>(connectedSources))
    : fallback.meta.availableSources;

  const sourceConfidence = {
    ...(realParts.length === 0 ? fallback.sourceConfidence : {}),
    ...realParts.reduce<NonNullable<ReportData["sourceConfidence"]>>(
      (acc, part) => ({ ...acc, ...part.sourceConfidence }),
      {},
    ),
  };

  // Merge kpiSnapshot metrics from all real parts rather than letting the
  // last source win. Deduplicate by label so GA4 + GSC metrics combine cleanly.
  const kpiSnapshot = mergeKpiSnapshot(fallback, realParts);

  // Join GA4 and GSC top pages by URL so each page shows both traffic and
  // search data instead of one source overwriting the other.
  const topPages = mergeTopPages(realParts);

  // Suppress paidOverview when google_ads isn't connected — without it the
  // dashboard would show mock paid numbers as if they were real.
  const hasAds = connectedSources.includes("google_ads");
  const paidOverview = hasAds ? merged.paidOverview : undefined;

  return {
    ...merged,
    kpiSnapshot,
    topPages: topPages ?? merged.topPages,
    paidOverview,
    meta: {
      ...fallback.meta,
      ...merged.meta,
      availableSources,
    },
    sourceConfidence,
  };
}

function mergeKpiSnapshot(
  fallback: ReportData,
  realParts: Partial<ReportData>[],
): ReportData["kpiSnapshot"] {
  const snapshots = realParts
    .map((p) => p.kpiSnapshot)
    .filter((s): s is NonNullable<ReportData["kpiSnapshot"]> => s !== undefined);

  if (snapshots.length === 0) return fallback.kpiSnapshot;

  // Use the first snapshot for period labels, then combine all metrics.
  const base = snapshots[0];
  const seen = new Set<string>();
  const metrics: Metric[] = [];

  for (const snapshot of snapshots) {
    for (const metric of snapshot.metrics) {
      if (!seen.has(metric.label)) {
        seen.add(metric.label);
        metrics.push(metric);
      }
    }
  }

  return { ...base, metrics: metrics.slice(0, 6) };
}

function mergeTopPages(
  realParts: Partial<ReportData>[],
): ReportData["topPages"] | undefined {
  const allTopPages = realParts
    .map((p) => p.topPages)
    .filter((t): t is NonNullable<ReportData["topPages"]> => t !== undefined);

  if (allTopPages.length === 0) return undefined;
  if (allTopPages.length === 1) return allTopPages[0];

  // Build a map keyed by URL, merging fields from each source.
  const byUrl = new Map<string, NonNullable<ReportData["topPages"]>["pages"][number]>();

  for (const topPages of allTopPages) {
    for (const page of topPages.pages) {
      const existing = byUrl.get(page.url);
      byUrl.set(page.url, existing ? { ...existing, ...page } : page);
    }
  }

  return { pages: Array.from(byUrl.values()) };
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
