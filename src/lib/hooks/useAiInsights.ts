"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportData } from "@/types/schema";
import {
  AI_INSIGHTS_FALLBACK_TEXT,
  createNullAiInsightsPayload,
  type AiInsightsPayload,
} from "@/lib/ai-insights/types";

export type { AiInsightsPayload };

export const FALLBACK_TEXT = AI_INSIGHTS_FALLBACK_TEXT;

// ─── Client-side dedup key ────────────────────────────────────────────────────
// The server computes the real SHA-256 hash (Node crypto, server-only).
// The hook only needs a stable key to avoid re-firing the same request twice.
// We use a lightweight fingerprint: total sessions + total clicks + available
// sources. This is not a cache key — it just prevents the effect from running
// when reportData identity changes without the underlying numbers changing.
function clientDataFingerprint(data: ReportData): string {
  const sessions = data.trafficOverview?.totalSessions?.value ?? 0;
  const clicks = data.seoOverview?.totalClicks?.value ?? 0;
  const sources = (data.meta.availableSources ?? []).slice().sort().join(",");
  const spend = data.paidOverview?.totalSpend?.value ?? 0;
  const convs = data.conversions?.totalConversions?.value ?? 0;
  return `${sessions}|${clicks}|${spend}|${convs}|${sources}`;
}

type InsightsState = {
  key: string;
  payload: AiInsightsPayload;
} | null;

// Max number of polls before giving up and showing null insights.
const MAX_POLL_ATTEMPTS = 8;
// Delay between polls in ms (3 seconds).
const POLL_INTERVAL_MS = 3_000;

export function useAiInsights(
  reportData: ReportData | null,
  userId: string | null,
  periodStart: string,
  periodEnd: string,
  periodLabel: string,
) {
  const [insightsState, setInsightsState] = useState<InsightsState>(null);
  const [loading, setLoading] = useState(false);
  const inflightKeyRef = useRef<string | null>(null);

  const fingerprint = reportData ? clientDataFingerprint(reportData) : "no-data";
  const key = `${periodStart}:${periodEnd}:${fingerprint}`;
  const hasData = reportData !== null;

  useEffect(() => {
    if (!hasData || !userId) return;
    if (inflightKeyRef.current === key) return;

    let cancelled = false;

    async function fetchInsights(attempt: number): Promise<void> {
      if (cancelled) return;

      try {
        const res = await fetch("/api/generate-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            period: { start: periodStart, end: periodEnd, label: periodLabel },
          }),
        });

        if (cancelled) return;

        // 202: server is generating (another request holds the lease). Poll.
        if (res.status === 202) {
          if (attempt < MAX_POLL_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            return fetchInsights(attempt + 1);
          }
          // Gave up polling — show null rather than spinner forever.
          setInsightsState({ key, payload: createNullAiInsightsPayload() });
          return;
        }

        if (!res.ok) {
          setInsightsState({ key, payload: createNullAiInsightsPayload() });
          return;
        }

        const json = await res.json();
        if (json.insights) {
          setInsightsState({ key, payload: json.insights });
        } else {
          setInsightsState({ key, payload: createNullAiInsightsPayload() });
        }
      } catch {
        if (!cancelled) {
          // Silent fail: UI shows the honest null state.
          setInsightsState({ key, payload: createNullAiInsightsPayload() });
        }
      }
    }

    async function run() {
      inflightKeyRef.current = key;
      setLoading(true);
      try {
        await fetchInsights(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        inflightKeyRef.current = null;
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  // key encodes period + data fingerprint; userId gates the fetch.
  // hasData guards against null reportData without object identity churn.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, hasData]);

  return {
    insights: insightsState?.key === key ? insightsState.payload : null,
    loading: loading || (hasData && Boolean(userId) && insightsState?.key !== key),
  };
}
