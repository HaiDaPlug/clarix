import type { ReportData } from "@/types/schema";

// Session-scoped snapshot of the merged ReportData so revisits within the same
// tab paint instantly while fresh data revalidates in the background.
// Only successful loads are stored — never noSources or error outcomes.
//
// Every key carries the workspace id and the exact property ids the data was
// built from, and a read must name the workspace it wants. A snapshot for
// customer A therefore cannot be painted on a page showing customer B, no
// matter which device switched the active workspace.

const SNAPSHOT_PREFIX = "clarix:report-snapshot:v3";
const SCOPE_PREFIX = "clarix:report-snapshot:scope";

export type ReportSnapshotScope = {
  workspaceId: string;
  /** Stable key of the properties the data came from, e.g. "ga4:123+gsc:sc-domain:x". */
  propertyKey: string;
};

export function propertyKeyFor(sources: Array<{ source: string; propertyId: string }>): string {
  return sources
    .map((s) => `${s.source}:${s.propertyId}`)
    .sort()
    .join("+");
}

function snapshotKey(scope: ReportSnapshotScope, rangeStart: string, rangeEnd: string): string {
  return `${SNAPSHOT_PREFIX}:${scope.workspaceId}:${scope.propertyKey}:${rangeStart}:${rangeEnd}`;
}

// The property key lives in the snapshot key but comes from a request that
// hasn't run yet at paint time, so the last-known key is remembered per
// workspace; a stale one just means a cache miss.
function scopeKey(workspaceId: string): string {
  return `${SCOPE_PREFIX}:${workspaceId}`;
}

export function readReportSnapshot(
  workspaceId: string,
  rangeStart: string,
  rangeEnd: string,
): { data: ReportData; scope: ReportSnapshotScope } | null {
  try {
    const propertyKey = window.sessionStorage.getItem(scopeKey(workspaceId));
    if (!propertyKey) return null;
    const scope: ReportSnapshotScope = { workspaceId, propertyKey };
    const raw = window.sessionStorage.getItem(snapshotKey(scope, rangeStart, rangeEnd));
    if (!raw) return null;
    return { data: JSON.parse(raw) as ReportData, scope };
  } catch {
    return null;
  }
}

export function writeReportSnapshot(
  scope: ReportSnapshotScope,
  rangeStart: string,
  rangeEnd: string,
  data: ReportData,
): void {
  try {
    window.sessionStorage.setItem(snapshotKey(scope, rangeStart, rangeEnd), JSON.stringify(data));
    window.sessionStorage.setItem(scopeKey(scope.workspaceId), scope.propertyKey);
  } catch {
    // Quota or serialization failure — snapshots are best-effort.
  }
}

/**
 * Drops every stored snapshot. Called when workspaces or their properties
 * change so nothing stale lingers in the tab; correctness does not depend on
 * it (reads are keyed by workspace), it just keeps sessionStorage tidy.
 */
export function clearReportSnapshots(): void {
  try {
    const storage = window.sessionStorage;
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key && (key.startsWith(SNAPSHOT_PREFIX) || key.startsWith(SCOPE_PREFIX))) storage.removeItem(key);
    }
  } catch {
    // best-effort
  }
}
