"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { ReportViewer } from "@/components/report/ReportViewer";
import { assembleDeck } from "@/lib/engine/narrative";
import {
  localizeMockReportData,
  scenario1,
  scenario2,
  scenario3,
} from "@/lib/mock-data";
import { useLocale } from "@/lib/i18n";
import { ReportData } from "@/types/schema";
import {
  ConnectableSource,
  ConnectedSource,
  currentCalendarMonthRange,
  mergeReportData,
} from "@/lib/google/connected-sources";
import { createClient } from "@/utils/supabase/client";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";

const SCENARIOS = [
  { id: "scenario-1", labelKey: "seoTraffic", data: scenario1 },
  { id: "scenario-2", labelKey: "full", data: scenario2 },
  { id: "scenario-3", labelKey: "partial", data: scenario3 },
] as const;
type ScenarioId = (typeof SCENARIOS)[number]["id"];

const EASING = [0.16, 1, 0.3, 1] as const;

export default function ReportPage() {
  const { locale, t } = useLocale();
  const [activeId, setActiveId] = useState<ScenarioId>(SCENARIOS[1].id);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  const active = useMemo(() => SCENARIOS.find((s) => s.id === activeId)!, [activeId]);
  const fallbackData = useMemo(
    () => localizeMockReportData(active.data, locale),
    [active.data, locale]
  );
  const activeData = reportData ?? fallbackData;
  const deck = useMemo(() => assembleDeck(activeData), [activeData]);

  useEffect(() => {
    let cancelled = false;

    async function loadRealData() {
      setIsLoadingRealData(true);
      setReportData(fallbackData);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"]);

      if (cancelled) return;

      if (error) {
        setReportData(fallbackData);
        setIsLoadingRealData(false);
        return;
      }

      const sources = (data ?? []).filter(
        (source): source is ConnectedSource =>
          source.source === "ga4" || source.source === "gsc",
      );

      if (sources.length === 0) {
        setReportData(fallbackData);
        setIsLoadingRealData(false);
        return;
      }

      const dateRange = currentCalendarMonthRange();
      const parts = await Promise.all(
        sources.map(async (source) => {
          try {
            const endpoint = source.source === "ga4" ? "/api/ga4" : "/api/gsc";
            const body =
              source.source === "ga4"
                ? { propertyId: source.property_id, dateRange, locale }
                : { siteUrl: source.property_id, dateRange, locale };
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            if (!response.ok) return undefined;
            return (await response.json()) as Partial<ReportData>;
          } catch {
            return undefined;
          }
        }),
      );

      if (cancelled) return;

      const connectedSourceIds = sources.map((source) => source.source);
      const merged = mergeReportData(
        fallbackData,
        parts,
        connectedSourceIds as ConnectableSource[],
      );
      if (!merged.executiveSummary) {
        merged.executiveSummary = deriveExecutiveSummary(merged, locale);
      }
      setReportData(merged);
      setIsLoadingRealData(false);
    }

    loadRealData();

    return () => {
      cancelled = true;
    };
  }, [fallbackData, locale]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASING }}
      className="relative min-h-dvh"
      data-loading-real-data={isLoadingRealData ? "true" : "false"}
    >
      <ReportViewer deck={deck} />

      {/* Dev-only scenario switcher — not part of the presentation surface */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="fixed top-3 left-3 z-[60] flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: "rgba(26,25,22,0.75)", backdropFilter: "blur(8px)" }}
        >
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="px-2.5 py-1 rounded-md transition-all"
              title={t.scenarios[s.labelKey].description}
              style={{
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.03em",
                color: activeId === s.id ? "var(--parchment)" : "rgba(155,152,148,0.7)",
                backgroundColor: activeId === s.id ? "rgba(255,255,255,0.12)" : "transparent",
              }}
            >
              {t.scenarios[s.labelKey].label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
