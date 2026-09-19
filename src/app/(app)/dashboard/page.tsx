"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { localizeMockReportData, scenario1, scenario2, scenario3 } from "@/lib/mock-data";
import { assembleDashboard } from "@/lib/dashboard/assemble";
import { kpiGridClass } from "@/lib/dashboard/grid";
import { useLocale } from "@/lib/i18n";
import { ShimmerCard, ShimmerOverlay } from "@/components/primitives/ShimmerCard";
import { useDateRange } from "@/lib/google/date-presets";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import { useAiInsights } from "@/lib/hooks/useAiInsights";
import { useDevScenario } from "@/lib/dev-scenario";
import type { ReportDataBuildResult, WorkspaceSummary } from "@/lib/report-data/server";
import type { ClientWorkspace } from "@/lib/clients/types";
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

function TextShimmer({ width, height }: { width: string; height: string }) {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        width,
        height,
        borderRadius: "4px",
        backgroundColor: "var(--bone)",
        verticalAlign: "middle",
      }}
    >
      <ShimmerOverlay />
    </span>
  );
}

function SectionItem({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  if (item.itemId === "channel-breakdown") return <ChannelBreakdown item={item} data={data} />;
  if (item.itemId === "search-visibility") return <SearchVisibility item={item} data={data} />;
  if (item.itemId === "paid-performance") return <PaidPerformance item={item} data={data} />;
  return null;
}

// What the dashboard should say when the active workspace has sources but the
// server could not produce numbers. Each maps to one banner, never to mock data.
type DataProblem =
  | { kind: "reconnect"; disconnected: boolean }
  | { kind: "unavailable" }
  | { kind: "partial"; sources: string[] };

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
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  // The workspace this page shows. Resolved once from the user's preference
  // (`/api/clients/active`), then named explicitly on every data request —
  // the server never substitutes another one. undefined = not resolved yet.
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [hasConnectedSources, setHasConnectedSources] = useState(false);
  const [connectedSourceTypes, setConnectedSourceTypes] = useState<string[]>([]);
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [problem, setProblem] = useState<DataProblem | null>(null);
  const [noDataForPeriod, setNoDataForPeriod] = useState(false);

  const active = useMemo(() => SCENARIOS.find((s) => s.id === activeId)!, [activeId]);
  const fallbackData = useMemo(() => localizeMockReportData(active.data, locale), [active.data, locale]);
  const activeData = reportData ?? fallbackData;
  const dashboard = useMemo(() => assembleDashboard(activeData, t), [activeData, t]);

  // Insights are keyed by workspace, so switching customers can never reuse
  // the previous one's copy. Only ask for them when real numbers exist —
  // a reconnect / no-data state has nothing to summarise.
  const insightsWorkspaceId =
    reportData && hasConnectedSources && !problem && !noDataForPeriod ? workspace?.id ?? null : null;
  const { insights: aiInsights, loading: aiInsightsLoading } = useAiInsights(
    reportData,
    insightsWorkspaceId,
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

  const rangeStart = dateRange.startDate;
  const rangeEnd = dateRange.endDate;

  // Resolve which workspace to show, once per mount.
  useEffect(() => {
    let cancelled = false;
    async function resolveWorkspace() {
      try {
        const response = await fetch("/api/clients/active", { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        const payload = response.ok ? ((await response.json()) as { client: ClientWorkspace | null }) : { client: null };
        if (cancelled) return;
        setClientId(payload.client?.id ?? null);
        setWorkspace(payload.client ? { id: payload.client.id, name: payload.client.name, domain: payload.client.domain } : null);
      } catch {
        if (!cancelled) setClientId(null);
      }
    }
    void resolveWorkspace();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (clientId === undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function loadRealData() {
      setIsLoadingRealData(true);
      setDataError(null);
      setProblem(null);
      setReportData(null);
      setNoDataForPeriod(false);

      if (clientId === null) {
        // No workspace yet: sample data + the "connect sources" banner.
        setHasConnectedSources(false);
        setConnectedSourceTypes([]);
        setIsLoadingRealData(false);
        return;
      }

      const periodLabel = formatDateRangeLabel({ startDate: rangeStart }, locale);

      // Numbers that must never be shown as if they were real when the
      // workspace has sources but nothing could be fetched.
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
          period: { label: periodLabel, startDate: rangeStart, endDate: rangeEnd },
        },
      };

      let result: ReportDataBuildResult;
      try {
        const response = await fetch("/api/report-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, dateRange: { startDate: rangeStart, endDate: rangeEnd }, periodLabel, locale }),
          signal,
        });
        if (signal.aborted) return;
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (response.status === 404) {
          // The workspace was deleted elsewhere. Fall back to "nothing selected".
          setClientId(null);
          setWorkspace(null);
          return;
        }
        if (!response.ok) throw new Error(`report-data ${response.status}`);
        result = (await response.json()) as ReportDataBuildResult;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (signal.aborted) return;
        setHasConnectedSources(false);
        setDataError(locale === "sv" ? "Kunde inte hämta dina datakällor." : "Could not load your data sources.");
        setIsLoadingRealData(false);
        return;
      }

      if (signal.aborted) return;

      setWorkspace(result.workspace);
      const sourceTypes = [...new Set(result.sources.map((s) => s.source))];
      setConnectedSourceTypes(sourceTypes);

      if (result.status === "no_sources") {
        setHasConnectedSources(false);
        setIsLoadingRealData(false);
        return;
      }

      setHasConnectedSources(true);

      if (result.status === "reconnect_required") {
        setProblem({ kind: "reconnect", disconnected: result.google.status === "disconnected" });
        setReportData(emptyBase);
        setIsLoadingRealData(false);
        return;
      }

      if (result.status === "unavailable") {
        setProblem({ kind: "unavailable" });
        setReportData(emptyBase);
        setIsLoadingRealData(false);
        return;
      }

      if (result.status === "no_data") {
        // The grant works; this range simply has nothing (or a property-level
        // permission failed). Both are stated, neither is faked.
        const denied = result.failures
          .filter((f) => f.reason === "google_403" || f.reason === "google_401")
          .map((f) => (f.source === "ga4" ? "Google Analytics" : "Search Console"));
        if (denied.length > 0) setProblem({ kind: "partial", sources: denied });
        else setNoDataForPeriod(true);
        setReportData(emptyBase);
        setIsLoadingRealData(false);
        return;
      }

      const denied = result.failures
        .filter((f) => f.reason === "google_403" || f.reason === "google_401")
        .map((f) => (f.source === "ga4" ? "Google Analytics" : "Search Console"));
      if (denied.length > 0) setProblem({ kind: "partial", sources: denied });

      setReportData(result.data);
      setIsLoadingRealData(false);
    }

    loadRealData();
    return () => controller.abort();
  }, [clientId, fallbackData, locale, rangeStart, rangeEnd, router]);

  const heroItem = dashboard.items.find((item) => item.definition.type === "hero");
  const kpiItems = dashboard.items.filter((item) => item.definition.type === "kpi");
  const chartItems = dashboard.items.filter((item) => item.definition.type === "chart");
  const sectionItems = dashboard.items.filter((item) => item.definition.type === "section");

  const problemText = (() => {
    if (!problem) return null;
    if (problem.kind === "reconnect") {
      return locale === "sv"
        ? problem.disconnected
          ? { strong: "Google är inte anslutet.", rest: "Anslut ditt Google-konto för att hämta data.", cta: "Anslut Google" }
          : { strong: "Google-åtkomsten behöver förnyas.", rest: "Dina valda egendomar finns kvar — anslut igen så hämtas datan.", cta: "Anslut igen" }
        : problem.disconnected
          ? { strong: "Google is not connected.", rest: "Connect your Google account to fetch data.", cta: "Connect Google" }
          : { strong: "Google access needs renewal.", rest: "Your selected properties are kept — reconnect and the data returns.", cta: "Reconnect" };
    }
    if (problem.kind === "unavailable") {
      return locale === "sv"
        ? { strong: "Google svarade inte just nu.", rest: "Din anslutning är oförändrad. Försök igen om en stund.", cta: null }
        : { strong: "Google did not respond right now.", rest: "Your connection is unchanged. Try again in a moment.", cta: null };
    }
    return locale === "sv"
      ? { strong: `${problem.sources.join(" och ")} saknar behörighet till den valda egendomen.`, rest: "Välj en annan egendom under Integrationer.", cta: "Integrationer" }
      : { strong: `${problem.sources.join(" and ")} lacks permission to the selected property.`, rest: "Pick another property under Integrations.", cta: "Integrations" };
  })();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header
        className="sticky top-0 z-30 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[44px_auto] items-center gap-x-3 gap-y-2 border-b px-4 py-4 sm:flex sm:min-h-[88px] sm:items-center sm:justify-between sm:px-6 lg:px-8"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)", minHeight: "88px" }}
      >
        <div className="col-start-1 row-start-2 min-w-0 sm:block">
          <p className="eyebrow" style={{ color: "var(--slate)" }}>
            {isLoadingRealData || aiInsightsLoading ? <TextShimmer width="72px" height="13px" /> : activeData.meta.period.label}
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em", marginTop: "2px" }}>
            {isLoadingRealData || aiInsightsLoading ? <TextShimmer width="140px" height="20px" /> : t.dashboard.heading}
          </h1>
        </div>
        <div className="contents sm:flex sm:w-auto sm:items-center sm:justify-end sm:gap-2">
          <div className="col-start-2 row-start-2 justify-self-end">
            <DateRangePicker locale={locale} />
          </div>
          <button
            className="col-start-2 row-start-1 inline-flex min-h-11 items-center gap-2 justify-self-end rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:min-h-10"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            <Download className="h-4 w-4" />
            Exportera
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 sm:gap-7 sm:px-6 sm:py-8 lg:px-8">

        {problemText && !isLoadingRealData && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex flex-col gap-3 rounded-2xl px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: "var(--bone)", border: `1px solid ${problem?.kind === "unavailable" ? "var(--rule)" : "var(--signal-down-bg)"}` }}
            role="status"
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: problem?.kind === "unavailable" ? "var(--slate)" : "var(--signal-down)" }} />
              <p style={{ fontSize: "13px", color: "var(--slate)", lineHeight: 1.45 }}>
                <span style={{ color: "var(--charcoal)", fontWeight: 500 }}>{problemText.strong}</span>{" "}
                {problemText.rest}
              </p>
            </div>
            {problemText.cta && (
              <Link href="/integrations" className="shrink-0 sm:ml-6" style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}>
                {problemText.cta}
              </Link>
            )}
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

        {heroItem && (
          <div
            className="flex flex-col gap-6 min-h-[calc(100dvh-88px-2.5rem)] sm:min-h-[calc(100dvh-88px-4rem)]"
          >
            <div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.75rem)", fontWeight: 700, color: "var(--charcoal)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {isLoadingRealData || aiInsightsLoading ? (
                  <TextShimmer width="240px" height="2.75rem" />
                ) : workspace?.name ? (
                  <>
                    <span style={{ color: "var(--slate)", fontWeight: 400 }}>Välkommen, </span>
                    {workspace.name}
                  </>
                ) : (
                  "Välkommen"
                )}
              </p>
              <p style={{ marginTop: "6px", fontSize: "15px", color: "var(--slate)", lineHeight: 1.5 }}>
                {isLoadingRealData || aiInsightsLoading ? (
                  <TextShimmer width="200px" height="15px" />
                ) : (
                  `${activeData.meta.period.label} · Din digitala rapport är redo.`
                )}
              </p>
            </div>
            <DashboardHero
              data={activeData}
              aiInsights={aiInsights}
              loading={isLoadingRealData || aiInsightsLoading}
              minHeight="0"
            />
          </div>
        )}

        {isLoadingRealData ? (
          <>
            {skeletonKpiCount > 0 && (
              <div className={`grid gap-4 ${kpiGridClass(skeletonKpiCount)}`}>
                {Array.from({ length: skeletonKpiCount }).map((_, i) => (
                  <ShimmerCard key={i} loading height={160} />
                ))}
              </div>
            )}
            <ShimmerCard loading height={340} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ShimmerCard loading height={280} />
              <ShimmerCard loading height={280} />
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="flex flex-col gap-5 sm:gap-7"
          >
            {kpiItems.length > 0 && (
              <div className={`grid gap-4 ${kpiGridClass(kpiItems.length)}`}>
                {kpiItems.map((item, index) => (
                  <KpiCard key={item.itemId} item={item} data={activeData} index={index} loading={false} animateNumbers={hasConnectedSources} />
                ))}
              </div>
            )}

            {chartItems.map((item) => (
              <SessionsChart key={item.itemId} item={item} data={activeData} />
            ))}

            {sectionItems.length > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {sectionItems.map((item) => (
                  <SectionItem key={item.itemId} item={item} data={activeData} />
                ))}
                <NextStepsCard data={activeData} aiInsights={aiInsights} loading={aiInsightsLoading} />
              </div>
            )}
          </motion.div>
        )}

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
