"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportData } from "@/types/schema";
import { hashAiInsightMetrics } from "@/lib/ai-insights/cache";
import {
  AI_INSIGHTS_FALLBACK_TEXT,
  createNullAiInsightsPayload,
  type AiInsightsPayload,
} from "@/lib/ai-insights/types";

export type { AiInsightsPayload };

export const FALLBACK_TEXT = AI_INSIGHTS_FALLBACK_TEXT;

type InsightsState = {
  key: string;
  payload: AiInsightsPayload;
} | null;

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
  const metricsKey = reportData ? hashAiInsightMetrics(reportData) : "no-data";
  const key = `${periodStart}:${periodEnd}:${metricsKey}`;
  // Stable boolean — true once real data has arrived for this period.
  // Used as a dep instead of the reportData object to avoid re-firing on
  // every identity change (re-merge, locale switch) while still triggering
  // when data arrives after userId is already set.
  const hasData = reportData !== null;

  useEffect(() => {
    if (!hasData || !userId) return;
    if (inflightKeyRef.current === key) return;

    async function generate() {
      inflightKeyRef.current = key;
      setLoading(true);
      try {
        const res = await fetch("/api/generate-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            period: { start: periodStart, end: periodEnd, label: periodLabel },
          }),
        });
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
        // Silent fail: UI shows the honest null state instead of deterministic copy.
        setInsightsState({ key, payload: createNullAiInsightsPayload() });
      } finally {
        setLoading(false);
        inflightKeyRef.current = null;
      }
    }

    generate();
  // hasData (not reportData) is the dep — fires when data arrives regardless
  // of which resolved first (userId or reportData). Object identity excluded
  // intentionally to avoid re-firing on re-merge or locale changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, hasData]);

  return {
    insights: insightsState?.key === key ? insightsState.payload : null,
    loading: loading || (hasData && Boolean(userId) && insightsState?.key !== key),
  };
}
