"use client";

/* Visual harness for the dashboard — mock data only.
 *
 * Renders <DashboardView> with the mock scenarios and hand-written AI copy so
 * the dashboard can be screenshotted at exact viewports, in both themes and in
 * every data state, without a signed-in session. Nothing here touches a
 * workspace or an API. Lives beside /report-lab so it goes with the same
 * cleanup, or stays as the dashboard's visual harness if that proves useful.
 *
 *   /report-lab/dashboard?scenario=2&state=ready&ai=on&theme=light
 *
 *   scenario  1 | 2 | 3                 which mock report
 *   state     ready | loading | sample | nodata | reconnect | unavailable | partial
 *   ai        on | off | long           AI copy present, honest-null, or stress-length
 *   theme     light | dark
 */

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { AppShell } from "@/components/layout/AppShell";
import { assembleDashboard } from "@/lib/dashboard/assemble";
import { localizeMockReportData, scenario1, scenario2, scenario3 } from "@/lib/mock-data";
import { DashboardView, type DataProblem } from "@/components/dashboard/DashboardView";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import type { ReportData } from "@/types/schema";

const SCENARIOS = { "1": scenario1, "2": scenario2, "3": scenario3 } as const;

const AI_ON: AiInsightsPayload = {
  dashboard_hero: {
    headline: "Betald sökning drev +24 % fler leads i mars och organiken höll ställningen",
    sub: "Google Ads levererade 340 konverteringar till 12 % lägre kostnad per lead än i februari. Organisk trafik backade −3 % av säsongsskäl, men positionerna är stabila och inget strukturellt behöver åtgärdas.",
  },
  next_steps: [
    { rationale: "ROAS ligger på 4,2× — kampanjerna är lönsamma och budgeten kan höjas med 20 % utan att effektiviteten viker." },
    { rationale: "Sidorna på position 8–15 får 31 000 visningar men bara 1,8 % klick. Bättre titlar ger snabb CTR-effekt." },
    { rationale: "Avvisningsfrekvensen är 54 % på landningssidorna för annonserna — besökarna lämnar innan de agerar." },
  ],
  slide_hero: null,
  slide_insight: null,
  slide_recs: null,
  slide_recap: null,
};

const AI_LONG: AiInsightsPayload = {
  ...AI_ON,
  dashboard_hero: {
    headline: "Mars blev den starkaste månaden hittills för betald sökning med +24 % fler leads, samtidigt som den organiska trafiken tappade −3 % utan att någon enskild sida förlorade sina positioner",
    sub: "Google Ads levererade 340 konverteringar till en kostnad per lead som var 12 % lägre än i februari, vilket betyder att varje krona i annonsbudgeten nu ger mer tillbaka än på ett halvår. Organisk trafik backade −3 % — hela tappet ligger i säsongsberoende sökningar under vecka 10–12, medan de fem viktigaste sidorna behöll sina positioner. Direkttrafiken växte +4 % vilket tyder på att varumärket börjar bära sig självt.",
  },
};

const AI_OFF: AiInsightsPayload = {
  dashboard_hero: null,
  next_steps: null,
  slide_hero: null,
  slide_insight: null,
  slide_recs: null,
  slide_recap: null,
};

function emptyBase(data: ReportData): ReportData {
  return {
    ...data,
    trafficOverview: undefined,
    seoOverview: undefined,
    paidOverview: undefined,
    conversions: undefined,
    kpiSnapshot: undefined,
    topPages: undefined,
    executiveSummary: undefined,
    meta: { ...data.meta, availableSources: [] },
  };
}

function Harness() {
  const params = useSearchParams();
  const { locale, t } = useLocale();
  const { setTheme } = useTheme();

  const scenarioKey = (params.get("scenario") ?? "2") as keyof typeof SCENARIOS;
  const state = params.get("state") ?? "ready";
  const ai = params.get("ai") ?? "on";
  const theme = params.get("theme");

  useEffect(() => {
    if (theme === "dark" || theme === "light") setTheme(theme);
  }, [theme, setTheme]);

  const base = useMemo(
    () => localizeMockReportData(SCENARIOS[scenarioKey] ?? scenario2, locale),
    [scenarioKey, locale],
  );

  // While loading, the real page shows the mock fallback underneath its
  // skeletons, so the harness does the same.
  const showsNumbers = state === "ready" || state === "sample" || state === "partial" || state === "loading";
  const data = useMemo(() => (showsNumbers ? base : emptyBase(base)), [showsNumbers, base]);
  const dashboard = useMemo(() => assembleDashboard(data, t), [data, t]);

  const problem: DataProblem | null =
    state === "reconnect" ? { kind: "reconnect", disconnected: false }
    : state === "unavailable" ? { kind: "unavailable" }
    : state === "partial" ? { kind: "partial", sources: ["Search Console"] }
    : null;

  const aiInsights = state === "ready" || state === "partial"
    ? ai === "off" ? AI_OFF : ai === "long" ? AI_LONG : AI_ON
    : null;

  return (
    <DashboardView
      data={data}
      dashboard={dashboard}
      workspace={{ id: "preview", name: data.meta.clientName, domain: data.meta.clientDomain ?? null }}
      loading={state === "loading"}
      aiLoading={state === "loading"}
      aiInsights={aiInsights}
      hasConnectedSources={state !== "sample"}
      dataError={null}
      problem={problem}
      noDataForPeriod={state === "nodata"}
      skeletonKpiCount={6}
      animateNumbers={false}
    />
  );
}

export default function DashboardPreviewPage() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AppShell>
          <Suspense>
            <Harness />
          </Suspense>
        </AppShell>
      </LocaleProvider>
    </ThemeProvider>
  );
}
