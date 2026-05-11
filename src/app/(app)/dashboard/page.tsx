"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Calendar, Download } from "lucide-react";
import { localizeMockReportData, scenario1, scenario2, scenario3 } from "@/lib/mock-data";
import { assembleDashboard } from "@/lib/dashboard/assemble";
import { useLocale } from "@/lib/i18n";
import { ShimmerCard } from "@/components/primitives/ShimmerCard";
import { ConnectableSource, ConnectedSource, currentCalendarMonthRange, mergeReportData } from "@/lib/google/connected-sources";
import { createClient } from "@/utils/supabase/client";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
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
  const { locale, t } = useLocale();
  const { activeId } = useDevScenario();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [hasConnectedSources, setHasConnectedSources] = useState(false);
  const [connectedSourceTypes, setConnectedSourceTypes] = useState<string[]>([]);
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [expiredSources, setExpiredSources] = useState<string[]>([]);

  const active = useMemo(() => SCENARIOS.find((s) => s.id === activeId)!, [activeId]);
  const fallbackData = useMemo(() => localizeMockReportData(active.data, locale), [active.data, locale]);
  const activeData = reportData ?? fallbackData;
  const dashboard = useMemo(() => assembleDashboard(activeData, t), [activeData, t]);

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
        setReportData(fallbackData);
        setIsLoadingRealData(false);
        return;
      }

      const dateRange = currentCalendarMonthRange();
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
            const hasRealData = Boolean(data.trafficOverview || data.seoOverview);
            if (hasRealData) successfulSourceIds.push(source.source);
            return hasRealData ? data : undefined;
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return undefined;
            return undefined;
          }
        }),
      );

      if (signal.aborted) return;

      setExpiredSources(expired);
      const merged = mergeReportData(fallbackData, parts, successfulSourceIds);
      if (successfulSourceIds.length > 0) {
        merged.meta = {
          ...merged.meta,
          period: {
            label: formatDateRangeLabel(dateRange, locale),
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        };
      }
      if (!merged.executiveSummary) {
        merged.executiveSummary = deriveExecutiveSummary(merged, locale);
      }
      setReportData(merged);
      setIsLoadingRealData(false);
    }

    loadRealData();
    return () => controller.abort();
  }, [fallbackData, locale]);

  const heroItem = dashboard.items.find((item) => item.definition.type === "hero");
  const kpiItems = dashboard.items.filter((item) => item.definition.type === "kpi");
  const chartItems = dashboard.items.filter((item) => item.definition.type === "chart");
  const sectionItems = dashboard.items.filter((item) => item.definition.type === "section");

  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      <header
        className="flex items-center justify-between px-8 border-b shrink-0 sticky top-0 z-30"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)", height: "88px" }}
      >
        <div>
          <p className="eyebrow" style={{ color: "var(--slate)" }}>{activeData.meta.period.label}</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em", marginTop: "2px" }}>
            {t.dashboard.heading}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)]"
            style={{ border: "1px solid var(--rule)", color: "var(--charcoal)", backgroundColor: "var(--bone)" }}
          >
            <Calendar className="h-4 w-4" style={{ color: "var(--slate)" }} />
            Senaste 30 dagarna
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            <Download className="h-4 w-4" />
            Exportera
          </button>
        </div>
      </header>

      <main className="flex-1 px-8 py-8 flex flex-col gap-7">

        {expiredSources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--signal-down-bg)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--signal-down)" }} />
              <p style={{ fontSize: "13px", color: "var(--slate)" }}>
                <span style={{ color: "var(--charcoal)", fontWeight: 500 }}>{expiredSources.join(" and ")} connection expired.</span>{" "}
                Reconnect to see your latest data.
              </p>
            </div>
            <Link href="/integrations" className="shrink-0 ml-6" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}>
              Reconnect
            </Link>
          </motion.div>
        )}

        {((!hasConnectedSources && !isLoadingRealData) || dataError) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#C97B2A" }} />
              <p style={{ fontSize: "13px", color: "var(--slate)" }}>
                {dataError ?? t.dashboard.sampleBanner.text}{" "}
                {!hasConnectedSources && !dataError && (
                  <>
                    <span style={{ color: "var(--charcoal)", fontWeight: 500 }}>{t.dashboard.sampleBanner.cta}</span>{" "}
                    {t.dashboard.sampleBanner.suffix}
                  </>
                )}
              </p>
            </div>
            <Link href="/integrations" className="shrink-0 ml-6" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}>
              {t.dashboard.sampleBanner.link}
            </Link>
          </motion.div>
        )}

        {heroItem && !isLoadingRealData && <DashboardHero item={heroItem} data={activeData} />}

        {isLoadingRealData ? (
          skeletonKpiCount > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: skeletonKpiCount }).map((_, i) => (
                <ShimmerCard key={i} loading height={160} />
              ))}
            </div>
          )
        ) : (
          kpiItems.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <ShimmerCard loading height={280} />
            <ShimmerCard loading height={280} />
          </div>
        ) : sectionItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {sectionItems.map((item) => (
              <SectionItem key={item.itemId} item={item} data={activeData} />
            ))}
            <NextStepsCard data={activeData} />
          </div>
        ) : null}

        {dashboard.nudge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: EASING }}
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <p style={{ fontSize: "13px", color: "var(--slate)" }}>{dashboard.nudge.message}</p>
            <Link href="/integrations" className="shrink-0 ml-6" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}>
              {t.dashboard.nudge.link}
            </Link>
          </motion.div>
        )}

      </main>
    </div>
  );
}
