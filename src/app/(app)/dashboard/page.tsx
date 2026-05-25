"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Download } from "lucide-react";
import { localizeMockReportData, scenario1, scenario2, scenario3 } from "@/lib/mock-data";
import { assembleDashboard } from "@/lib/dashboard/assemble";
import { useLocale } from "@/lib/i18n";
import { ShimmerCard } from "@/components/primitives/ShimmerCard";
import { ConnectableSource, ConnectedSource, mergeReportData } from "@/lib/google/connected-sources";
import { useDateRange } from "@/lib/google/date-presets";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import { createClient } from "@/utils/supabase/client";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import { useAiInsights } from "@/lib/hooks/useAiInsights";
import { useDevScenario } from "@/lib/dev-scenario";
import { AssembledDashboardItem } from "@/types/dashboard";
import { ReportData } from "@/types/schema";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SessionsChart } from "@/components/dashboard/SessionsChart";
import { ChannelBreakdown } from "@/components/dashboard/ChannelBreakdown";
import { SearchVisibility } from "@/components/dashboard/SearchVisibility";
import { PaidPerformance } from "@/components/dashboard/PaidPerformance";
import { NextStepsCard } from "@/components/dashboard/NextStepsCard";

const SCENARIOS = [
  { id: "scenario-1", labelKey: "seoTraffic", data: scenario1 },
  { id: "scenario-2", labelKey: "full", data: scenario2 },
  { id: "scenario-3", labelKey: "partial", data: scenario3 },
] as const;

const MONTH_NAMES_SV = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDateRangeLabel(range: { startDate: string }, locale: string): string {
  const [year, month] = range.startDate.split("-").map(Number);
  const names = locale === "sv" ? MONTH_NAMES_SV : MONTH_NAMES_EN;
  return `${names[month - 1] ?? ""} ${year}`;
}

const EASING = [0.25, 0.1, 0.25, 1] as const;

function SectionItem({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  if (item.itemId === "channel-breakdown") return <ChannelBreakdown item={item} data={data} />;
  if (item.itemId === "search-visibility") return <SearchVisibility item={item} data={data} />;
  if (item.itemId === "paid-performance") return <PaidPerformance item={item} data={data} />;
  return null;
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const { locale, t } = useLocale();
  const { activeId } = useDevScenario();
  const dateRange = useDateRange();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [hasConnectedSources, setHasConnectedSources] = useState(false);
  const [connectedSourceTypes, setConnectedSourceTypes] = useState<string[]>([]);
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [expiredSources, setExpiredSources] = useState<string[]>([]);
  const [noDataForPeriod, setNoDataForPeriod] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string | null>(null);

  // Fetch user ID + active GA4 property name once
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    supabase
      .from("connected_sources")
      .select("display_name")
      .eq("source", "ga4")
      .neq("property_id", "_pending")
      .limit(1)
      .single()
      .then(({ data }) => {
        setPropertyName(data?.display_name ?? null);
      });
  }, []);

  const active = useMemo(() => SCENARIOS.find((s) => s.id === activeId)!, [activeId]);
  const fallbackData = useMemo(() => localizeMockReportData(active.data, locale), [active.data, locale]);
  const activeData = reportData ?? fallbackData;
  const dashboard = useMemo(() => assembleDashboard(activeData, t), [activeData, t]);

  const { insights: aiInsights, loading: aiInsightsLoading } = useAiInsights(
    reportData,
    userId,
    dateRange.startDate,
    dateRange.endDate,
    activeData.meta.period.label,
  );

  const skeletonKpiCount = useMemo(() => {
    if (!isLoadingRealData || connectedSourceTypes.length === 0) return 0;
    let count = 0;
    if (connectedSourceTypes.includes("ga4")) count += 4;
    if (connectedSourceTypes.includes("gsc")) count += 1;
    if (connectedSourceTypes.includes("google_ads")) count += 1;
    return count;
  }, [isLoadingRealData, connectedSourceTypes]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadRealData() {
      setIsLoadingRealData(true);
      setDataError(null);
      setReportData(null);
      setNoDataForPeriod(false);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"])
        .neq("property_id", "_pending");

      if (signal.aborted) return;

      if (error) {
        setHasConnectedSources(false);
        setDataError("Could not load connected data sources.");
        setIsLoadingRealData(false);
        return;
      }

      const sources = (data ?? []).filter(
        (source): source is ConnectedSource => source.source === "ga4" || source.source === "gsc",
      );
      setHasConnectedSources(sources.length > 0);
      setConnectedSourceTypes([...new Set(sources.map((s) => s.source))]);

      if (sources.length === 0) {
        setIsLoadingRealData(false);
        return;
      }

      const expired: string[] = [];
      const successfulSourceIds: ConnectableSource[] = [];
      const parts = await Promise.all(
        sources.map(async (source) => {
          try {
            const endpoint = source.source === "ga4" ? "/api/ga4" : "/api/gsc";
            const body = source.source === "ga4"
              ? { propertyId: source.property_id, dateRange, locale }
              : { siteUrl: source.property_id, dateRange, locale };
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              signal,
            });
            if (response.status === 401 || response.status === 403) {
              expired.push(source.source === "ga4" ? "Google Analytics" : "Search Console");
              return undefined;
            }
            if (!response.ok) return undefined;
            const data = (await response.json()) as Partial<ReportData>;
            const isConnected = data.sourceConfidence?.[source.source]?.connected !== false;
            if (isConnected) successfulSourceIds.push(source.source);
            return isConnected ? data : undefined;
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return undefined;
            return undefined;
          }
        }),
      );

      if (signal.aborted) return;

      setExpiredSources(expired);
      const periodLabel = formatDateRangeLabel(dateRange, locale);
      const emptyBase: ReportData = {
        ...fallbackData,
        trafficOverview: undefined,
        seoOverview: undefined,
        paidOverview: undefined,
        conversions: undefined,
        kpiSnapshot: undefined,
        topPages: undefined,
        executiveSummary: undefined,
        meta: {
          ...fallbackData.meta,
          availableSources: [],
          period: { label: periodLabel, startDate: dateRange.startDate, endDate: dateRange.endDate },
        },
      };
      const merged = mergeReportData(emptyBase, parts, successfulSourceIds);
      merged.meta = {
        ...merged.meta,
        period: { label: periodLabel, startDate: dateRange.startDate, endDate: dateRange.endDate },
      };
      const hasMetrics = Boolean(merged.trafficOverview || merged.seoOverview);
      setNoDataForPeriod(successfulSourceIds.length > 0 && !hasMetrics);
      if (!hasMetrics) {
        merged.executiveSummary = undefined;
      } else if (!merged.executiveSummary) {
        merged.executiveSummary = deriveExecutiveSummary(merged, locale);
      }
      setReportData(merged);
      setIsLoadingRealData(false);
    }

    loadRealData();
    return () => controller.abort();
  }, [fallbackData, locale, dateRange.startDate, dateRange.endDate]);

  const heroItem = dashboard.items.find((item) => item.definition.type === "hero");
  const kpiItems = dashboard.items.filter((item) => item.definition.type === "kpi");
  const chartItems = dashboard.items.filter((item) => item.definition.type === "chart");
  const sectionItems = dashboard.items.filter((item) => item.definition.type === "section");

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header
        className="sticky top-0 z-30 flex shrink-0 flex-col items-start justify-center gap-3 border-b py-4 pl-16 pr-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:pl-8"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)", minHeight: "88px" }}
      >
        <div className="min-w-0">
          <p className="eyebrow" style={{ color: "var(--slate)" }}>{activeData.meta.period.label}</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em", marginTop: "2px" }}>
            {t.dashboard.heading}
          </h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <DateRangePicker locale={locale} />
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            <Download className="h-4 w-4" />
            Exportera
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 sm:gap-7 sm:px-6 sm:py-8 lg:px-8">

        {expiredSources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex flex-col gap-3 rounded-2xl px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--signal-down-bg)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--signal-down)" }} />
              <p style={{ fontSize: "13px", color: "var(--slate)", lineHeight: 1.45 }}>
                <span style={{ color: "var(--charcoal)", fontWeight: 500 }}>{expiredSources.join(" and ")} connection expired.</span>{" "}
                Reconnect to see your latest data.
              </p>
            </div>
            <Link href="/integrations" className="shrink-0 sm:ml-6" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}>
              Reconnect
            </Link>
          </motion.div>
        )}

        {noDataForPeriod && !isLoadingRealData && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex items-center rounded-2xl px-5 py-4 sm:px-6 sm:py-5"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--charcoal)" }} />
              <p style={{ fontSize: "15px", color: "var(--charcoal)", lineHeight: 1.45 }}>
                {locale === "sv"
                  ? "Ingen data hittades för den valda perioden. GA4 var troligtvis inte anslutet då."
                  : "No data found for the selected period. GA4 was likely not connected at that time."}
              </p>
            </div>
          </motion.div>
        )}

        {((!hasConnectedSources && !isLoadingRealData) || dataError) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#C97B2A" }} />
              <p style={{ fontSize: "15px", color: "var(--charcoal)", lineHeight: 1.45 }}>
                {dataError ?? t.dashboard.sampleBanner.text}{" "}
                {!hasConnectedSources && !dataError && (
                  <>
                    <span style={{ fontWeight: 600 }}>{t.dashboard.sampleBanner.cta}</span>{" "}
                    {t.dashboard.sampleBanner.suffix}
                  </>
                )}
              </p>
            </div>
            <Link href="/integrations" className="shrink-0 sm:ml-6" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}>
              {t.dashboard.sampleBanner.link}
            </Link>
          </motion.div>
        )}

        {heroItem && !isLoadingRealData && (
          <div className="flex flex-col gap-6">
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.75rem)", fontWeight: 700, color: "var(--charcoal)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {propertyName ? (
                  <>
                    <span style={{ color: "var(--slate)", fontWeight: 400 }}>Välkommen, </span>
                    {propertyName}
                  </>
                ) : (
                  "Välkommen"
                )}
              </p>
              <p style={{ marginTop: "6px", fontSize: "15px", color: "var(--slate)", lineHeight: 1.5 }}>
                {activeData.meta.period.label} · Din digitala rapport är redo.
              </p>
            </div>
            <DashboardHero
              data={activeData}
              aiInsights={aiInsights}
              loading={aiInsightsLoading}
            />
          </div>
        )}

        {isLoadingRealData ? (
          skeletonKpiCount > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: skeletonKpiCount }).map((_, i) => (
                <ShimmerCard key={i} loading height={160} />
              ))}
            </div>
          )
        ) : (
          kpiItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {kpiItems.map((item, index) => (
                <KpiCard key={item.itemId} item={item} data={activeData} index={index} loading={false} animateNumbers={hasConnectedSources} />
              ))}
            </div>
          )
        )}

        {isLoadingRealData ? (
          <ShimmerCard loading height={340} />
        ) : (
          chartItems.map((item) => (
            <SessionsChart key={item.itemId} item={item} data={activeData} />
          ))
        )}

        {isLoadingRealData ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ShimmerCard loading height={280} />
            <ShimmerCard loading height={280} />
          </div>
        ) : sectionItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sectionItems.map((item) => (
              <SectionItem key={item.itemId} item={item} data={activeData} />
            ))}
            <NextStepsCard data={activeData} aiInsights={aiInsights} loading={aiInsightsLoading} />
          </div>
        ) : null}

        {dashboard.nudge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASING }}
            className="flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <p style={{ fontSize: "15px", color: "var(--charcoal)", lineHeight: 1.45 }}>{dashboard.nudge.message}</p>
            <Link href="/integrations" className="shrink-0 sm:ml-6" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}>
              {t.dashboard.nudge.link}
            </Link>
          </motion.div>
        )}

      </main>
    </div>
  );
}
