import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateRange } from "./report-types";

export type GoogleCacheSource = "ga4" | "gsc";

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_PERIOD_TTL_MS = 24 * 60 * 60 * 1000;
const LIVE_PERIOD_TTL_MS = 30 * 60 * 1000;

interface CacheKey {
  userId: string;
  source: GoogleCacheSource;
  propertyId: string;
  dateRange: DateRange;
}

/**
 * Pure freshness decision. A period whose end date is 2+ days before today
 * (UTC) is closed — Google's numbers no longer move — and stays fresh for
 * 24 hours. A period that includes today or yesterday is live and stays
 * fresh for 30 minutes.
 */
export function isCacheFresh(
  periodEnd: string,
  fetchedAt: string,
  now: Date = new Date(),
): boolean {
  const fetchedMs = Date.parse(fetchedAt);
  if (Number.isNaN(fetchedMs)) return false;

  const [year, month, day] = periodEnd.split("-").map(Number);
  const periodEndMs = Date.UTC(year, month - 1, day);
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const closed = todayMs - periodEndMs >= 2 * DAY_MS;

  const ttl = closed ? CLOSED_PERIOD_TTL_MS : LIVE_PERIOD_TTL_MS;
  return now.getTime() - fetchedMs < ttl;
}

/**
 * Returns the cached payload when a fresh row exists, otherwise null.
 * Any cache failure degrades silently to a miss — never throws.
 */
export async function readReportCache(
  supabase: SupabaseClient,
  key: CacheKey,
): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await supabase
      .from("google_report_cache")
      .select("payload, fetched_at")
      .eq("user_id", key.userId)
      .eq("source", key.source)
      .eq("property_id", key.propertyId)
      .eq("period_start", key.dateRange.startDate)
      .eq("period_end", key.dateRange.endDate)
      .maybeSingle();

    if (!data?.payload || typeof data.fetched_at !== "string") return null;
    if (!isCacheFresh(key.dateRange.endDate, data.fetched_at)) return null;
    return data.payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Upserts the mapped response body for this key. Failures are swallowed —
 * a cache write problem must never break the live response.
 */
export async function writeReportCache(
  supabase: SupabaseClient,
  key: CacheKey,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("google_report_cache").upsert(
      {
        user_id: key.userId,
        source: key.source,
        property_id: key.propertyId,
        period_start: key.dateRange.startDate,
        period_end: key.dateRange.endDate,
        payload,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source,property_id,period_start,period_end" },
    );
  } catch {
    // Silent by design.
  }
}

/**
 * Drops every cached row the user has for a source — used when a source is
 * disconnected or its property changes. Failures are swallowed.
 */
export async function clearReportCache(
  supabase: SupabaseClient,
  userId: string,
  source: GoogleCacheSource,
): Promise<void> {
  try {
    await supabase
      .from("google_report_cache")
      .delete()
      .eq("user_id", userId)
      .eq("source", source);
  } catch {
    // Silent by design.
  }
}
