import type { ReportData } from "@/types/schema";

// Session-scoped snapshot of the merged ReportData so revisits within the same
// tab paint instantly while fresh data revalidates in the background.
// Only successful loads are stored — never noSources or error outcomes.

const SNAPSHOT_PREFIX = "clarix:report-snapshot:v1";
const SOURCES_KEY = "clarix:report-snapshot:sources";

function snapshotKey(sourceIds: string[], rangeStart: string, rangeEnd: string): string {
  return `${SNAPSHOT_PREFIX}:${sourceIds.slice().sort().join("+")}:${rangeStart}:${rangeEnd}`;
}

// The connected-source ids live in the key, but they come from a query that
// hasn't run yet at hydration time. We remember the last-known set so the key
// can be rebuilt synchronously; a stale set just means a cache miss.
export function readReportSnapshot(rangeStart: string, rangeEnd: string): ReportData | null {
  try {
    const rawIds = window.sessionStorage.getItem(SOURCES_KEY);
    if (!rawIds) return null;
    const sourceIds = JSON.parse(rawIds) as string[];
    if (!Array.isArray(sourceIds) || sourceIds.length === 0) return null;
    const raw = window.sessionStorage.getItem(snapshotKey(sourceIds, rangeStart, rangeEnd));
    if (!raw) return null;
    return JSON.parse(raw) as ReportData;
  } catch {
    return null;
  }
}

export function writeReportSnapshot(
  sourceIds: string[],
  rangeStart: string,
  rangeEnd: string,
  data: ReportData,
): void {
  try {
    window.sessionStorage.setItem(snapshotKey(sourceIds, rangeStart, rangeEnd), JSON.stringify(data));
    window.sessionStorage.setItem(SOURCES_KEY, JSON.stringify(sourceIds));
  } catch {
    // Quota or serialization failure — snapshots are best-effort.
  }
}
