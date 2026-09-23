"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { localizeMockReportData, scenario1, scenario2, scenario3 } from "@/lib/mock-data";
import { assembleDashboard } from "@/lib/dashboard/assemble";
import { useLocale } from "@/lib/i18n";
import { useDateRange } from "@/lib/google/date-presets";
import { useAiInsights } from "@/lib/hooks/useAiInsights";
import { useDevScenario } from "@/lib/dev-scenario";
import type { ReportDataBuildResult, WorkspaceSummary } from "@/lib/report-data/server";
import type { ClientWorkspace } from "@/lib/clients/types";
import { ReportData } from "@/types/schema";
import { DashboardView, type DataProblem } from "@/components/dashboard/DashboardView";

const SCENARIOS = [
  { id: "scenario-1", labelKey: "seoTraffic", data: scenario1 },
  { id: "scenario-2", labelKey: "full", data: scenario2 },
  { id: "scenario-3", labelKey: "partial", data: scenario3 },
] as const;

const MONTH_NAMES_SV = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// "September 2026" for one month; a multi-month preset names both ends
// ("Juni – augusti 2026", "December 2025 – februari 2026") instead of
// labelling a three-month range with its first month only.
export function formatDateRangeLabel(range: { startDate: string; endDate: string }, locale: string): string {
  const [y1, m1] = range.startDate.split("-").map(Number);
  const [y2, m2] = range.endDate.split("-").map(Number);
  const names = locale === "sv" ? MONTH_NAMES_SV : MONTH_NAMES_EN;
  const first = names[m1 - 1] ?? "";
  if (y1 === y2 && m1 === m2) return `${first} ${y1}`;
  // Swedish writes months in lower case mid-phrase; the list is capitalised.
  const second = locale === "sv" ? (names[m2 - 1] ?? "").toLowerCase() : names[m2 - 1] ?? "";
  return y1 === y2 ? `${first} – ${second} ${y2}` : `${first} ${y1} – ${second} ${y2}`;
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
  // The count-up on the KPI numbers is a first-impression effect: it runs for
  // the first real load only. Later period or workspace changes render the
  // final value immediately so the dashboard feels settled rather than busy.
  const [countUpKey, setCountUpKey] = useState<string | null>(null);

  const active = useMemo(() => SCENARIOS.find((s) => s.id === activeId)!, [activeId]);
  // The sample carries its own fixed period ("Mars 2026"). Stamp it with the
  // range actually selected — the current month on the visitor's clock by
  // default — labelled the same way as real data, so nothing changes when the
  // real numbers land.
  const { startDate: selectedStart, endDate: selectedEnd } = dateRange;
  const fallbackData = useMemo(() => {
    const data = localizeMockReportData(active.data, locale);
    return {
      ...data,
      meta: {
        ...data.meta,
        period: { label: formatDateRangeLabel({ startDate: selectedStart, endDate: selectedEnd }, locale), startDate: selectedStart, endDate: selectedEnd },
      },
    };
  }, [active.data, locale, selectedStart, selectedEnd]);
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

      const periodLabel = formatDateRangeLabel({ startDate: rangeStart, endDate: rangeEnd }, locale);

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
      setCountUpKey((current) => current ?? `${clientId}:${rangeStart}:${rangeEnd}`);
      setIsLoadingRealData(false);
    }

    loadRealData();
    return () => controller.abort();
  }, [clientId, fallbackData, locale, rangeStart, rangeEnd, router]);

  const dataKey = `${clientId ?? "-"}:${rangeStart}:${rangeEnd}`;
  const animateNumbers = hasConnectedSources && (countUpKey === null || countUpKey === dataKey);

  return (
    <DashboardView
      data={activeData}
      dashboard={dashboard}
      workspace={workspace}
      loading={isLoadingRealData}
      aiLoading={aiInsightsLoading}
      aiInsights={aiInsights}
      hasConnectedSources={hasConnectedSources}
      dataError={dataError}
      problem={problem}
      noDataForPeriod={noDataForPeriod}
      skeletonKpiCount={skeletonKpiCount}
      animateNumbers={animateNumbers}
    />
  );
}
