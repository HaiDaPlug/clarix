"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { kpiGridClass } from "@/lib/dashboard/grid";
import { useLocale } from "@/lib/i18n";
import { ShimmerCard } from "@/components/primitives/ShimmerCard";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import type { WorkspaceSummary } from "@/lib/report-data/server";
import type { AssembledDashboard, AssembledDashboardItem } from "@/types/dashboard";
import type { ReportData } from "@/types/schema";
import { DashboardHero, DashboardStatePanel } from "@/components/dashboard/DashboardHero";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SessionsChart } from "@/components/dashboard/SessionsChart";
import { ChannelBreakdown } from "@/components/dashboard/ChannelBreakdown";
import { SearchVisibility } from "@/components/dashboard/SearchVisibility";
import { PaidPerformance } from "@/components/dashboard/PaidPerformance";
import { NextStepsCard } from "@/components/dashboard/NextStepsCard";

// What the dashboard should say when the active workspace has sources but the
// server could not produce numbers. Each maps to one banner, never to mock data.
export type DataProblem =
  | { kind: "reconnect"; disconnected: boolean }
  | { kind: "unavailable" }
  | { kind: "partial"; sources: string[] };

export interface DashboardViewProps {
  data: ReportData;
  dashboard: AssembledDashboard;
  workspace: WorkspaceSummary | null;
  /** Numbers are still being fetched. */
  loading: boolean;
  /** AI copy is still being generated. */
  aiLoading: boolean;
  aiInsights: AiInsightsPayload | null;
  hasConnectedSources: boolean;
  dataError: string | null;
  problem: DataProblem | null;
  noDataForPeriod: boolean;
  skeletonKpiCount: number;
  /** Count the KPI numbers up on arrival (first real load only). */
  animateNumbers: boolean;
}

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;
const METRICS_ID = "dashboard-metrics";

// Inline placeholder for a line of text. Spans only: it sits inside <p> and
// <h1>, where a <div> would be invalid HTML and break hydration.
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
        backgroundColor: "var(--surface-tint)",
        verticalAlign: "middle",
      }}
    >
      <span
        className="shimmer-sweep"
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          background: "linear-gradient(90deg, transparent 0%, oklch(0.62 0.22 280 / 0.10) 40%, oklch(0.72 0.18 280 / 0.18) 50%, oklch(0.62 0.22 280 / 0.10) 60%, transparent 100%)",
        }}
      />
    </span>
  );
}

function SectionItem({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  if (item.itemId === "channel-breakdown") return <ChannelBreakdown item={item} data={data} />;
  if (item.itemId === "search-visibility") return <SearchVisibility item={item} data={data} />;
  if (item.itemId === "paid-performance") return <PaidPerformance item={item} data={data} />;
  return null;
}

/** One quiet bordered row for status messages: a dot for the state, the
 *  sentence, and a plain link. `tone` only changes the dot and the border. */
function Notice({
  tone,
  children,
  cta,
  reduced,
}: {
  tone: "neutral" | "warn" | "problem";
  children: React.ReactNode;
  cta?: { href: string; label: string } | null;
  reduced: boolean;
}) {
  const dot = tone === "problem" ? "var(--signal-down)" : tone === "warn" ? "var(--brand-amber)" : "var(--text-secondary)";
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      role="status"
      className="surface-card flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      style={tone === "problem" ? { borderColor: "var(--signal-down-bg)" } : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
        <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.45 }}>{children}</p>
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="shrink-0 sm:ml-6"
          style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          {cta.label}
        </Link>
      )}
    </motion.div>
  );
}

export function DashboardView({
  data: activeData,
  dashboard,
  workspace,
  loading: isLoadingRealData,
  aiLoading: aiInsightsLoading,
  aiInsights,
  hasConnectedSources,
  dataError,
  problem,
  noDataForPeriod,
  skeletonKpiCount,
  animateNumbers,
}: DashboardViewProps) {
  const { locale, t } = useLocale();
  const reduced = !!useReducedMotion();

  const heroItem = dashboard.items.find((item) => item.definition.type === "hero");
  const kpiItems = dashboard.items.filter((item) => item.definition.type === "kpi");
  const chartItems = dashboard.items.filter((item) => item.definition.type === "chart");
  const sectionItems = dashboard.items.filter((item) => item.definition.type === "section");

  // Only "partial" is a banner; the other problems take over the opening (below).
  const problemText =
    problem?.kind !== "partial"
      ? null
      : locale === "sv"
        ? { strong: `${problem.sources.join(" och ")} saknar behörighet till den valda egendomen.`, rest: "Välj en annan egendom under Integrationer.", cta: "Integrationer →" }
        : { strong: `${problem.sources.join(" and ")} lacks permission to the selected property.`, rest: "Pick another property under Integrations.", cta: "Integrations →" };

  // States with no numbers to show take over the opening panel instead of
  // stacking banners above an empty page. "partial" keeps its banner: the
  // other source's numbers are still there.
  const sv = locale === "sv";
  const blocking: React.ComponentProps<typeof DashboardStatePanel> | null = isLoadingRealData
    ? null
    : problem?.kind === "reconnect"
      ? problem.disconnected
        ? {
            eyebrow: "Google",
            title: sv ? "Google är inte anslutet" : "Google isn't connected",
            body: sv ? "Anslut ditt Google-konto så hämtar Clarix siffrorna och skriver periodens sammanfattning." : "Connect your Google account and Clarix fetches the numbers and writes the period's summary.",
            action: { label: sv ? "Anslut Google" : "Connect Google", href: "/integrations" },
          }
        : {
            eyebrow: sv ? "Google-åtkomst" : "Google access",
            title: sv ? "Google-åtkomsten behöver förnyas" : "Google access needs renewing",
            body: sv ? "Dina valda egendomar finns kvar. Anslut igen så hämtas datan." : "Your selected properties are kept. Reconnect and the data returns.",
            action: { label: sv ? "Anslut Google igen" : "Reconnect Google", href: "/integrations" },
          }
      : problem?.kind === "unavailable"
        ? {
            eyebrow: activeData.meta.period.label,
            title: sv ? "Google svarade inte just nu" : "Google didn't respond just now",
            body: sv ? "Din anslutning är oförändrad. Försök igen om en stund." : "Your connection is unchanged. Try again in a moment.",
            action: { label: sv ? "Försök igen" : "Try again", onClick: () => window.location.reload() },
          }
        : dataError
          ? {
              eyebrow: activeData.meta.period.label,
              title: sv ? "Datan kunde inte hämtas" : "Couldn't load the data",
              body: dataError,
              action: { label: sv ? "Försök igen" : "Try again", onClick: () => window.location.reload() },
            }
          : noDataForPeriod
            ? {
                eyebrow: activeData.meta.period.label,
                title: sv ? "Ingen data för den här perioden" : "No data for this period",
                body: sv ? "Google gav inga siffror för perioden, troligen var GA4 inte anslutet då. Välj en annan period uppe till höger, eller kontrollera egendomen." : "Google returned no numbers for this period, likely GA4 wasn't connected then. Pick another period at the top right, or check the property.",
                action: { label: sv ? "Gå till Integrationer" : "Go to Integrations", href: "/integrations" },
              }
            : null;

  const busy = isLoadingRealData || aiInsightsLoading;
  const periodLabel = activeData.meta.period.label;
  const welcome = locale === "sv" ? "Välkommen" : "Welcome";
  const ready = locale === "sv" ? "Din digitala rapport är redo." : "Your digital report is ready.";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      {/* Compact header: the section, the period, and the period control. The
          report action lives in the summary panel, next to the conclusion. */}
      <header
        className="sticky top-0 z-30 shrink-0 border-b"
        style={{ borderColor: "var(--line)", backgroundColor: "var(--surface-page)" }}
      >
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1440px] items-center justify-between gap-3 py-2 pl-16 pr-4 sm:min-h-[72px] sm:px-6 sm:py-0 lg:px-8">
          <div className="min-w-0">
            <p className="eyebrow truncate">
              {isLoadingRealData ? <TextShimmer width="96px" height="12px" /> : periodLabel}
            </p>
            <h1
              className="font-display truncate"
              style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.015em", lineHeight: 1.2, marginTop: "2px" }}
            >
              {t.dashboard.heading}
            </h1>
          </div>
          <div className="shrink-0">
            <DateRangePicker locale={locale} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">

        {problemText && !isLoadingRealData && (
          <Notice
            tone="problem"
            cta={{ href: "/integrations", label: problemText.cta }}
            reduced={reduced}
          >
            <span style={{ fontWeight: 700 }}>{problemText.strong}</span> {problemText.rest}
          </Notice>
        )}

        {!hasConnectedSources && !isLoadingRealData && !dataError && (
          <Notice tone="warn" cta={{ href: "/integrations", label: t.dashboard.sampleBanner.link }} reduced={reduced}>
            {t.dashboard.sampleBanner.text}{" "}
            <span style={{ fontWeight: 700 }}>{t.dashboard.sampleBanner.cta}</span>{" "}
            {t.dashboard.sampleBanner.suffix}
          </Notice>
        )}

        {/* The first screen is the summary alone, on purpose: greeting, then
            the verdict for the period. The KPIs start below the fold. */}
        {(heroItem || blocking) && (
          <div className="flex flex-col gap-6 min-h-[calc(100dvh-64px-2rem)] sm:min-h-[calc(100dvh-72px-3rem)]">
            <div>
              <p
                className="font-display"
                style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", lineHeight: 1.1 }}
              >
                {busy ? (
                  <TextShimmer width="240px" height="2.5rem" />
                ) : workspace?.name ? (
                  <>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{welcome}, </span>
                    {workspace.name}
                  </>
                ) : (
                  welcome
                )}
              </p>
              <p style={{ marginTop: "6px", fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {busy ? <TextShimmer width="200px" height="15px" /> : blocking ? periodLabel : `${periodLabel} · ${ready}`}
              </p>
            </div>
            {blocking ? (
              <DashboardStatePanel {...blocking} />
            ) : (
              <DashboardHero
                data={activeData}
                aiInsights={aiInsights}
                loading={busy}
                sample={!hasConnectedSources && !dataError}
                exploreTargetId={!isLoadingRealData && kpiItems.length > 0 ? METRICS_ID : undefined}
              />
            )}
          </div>
        )}

        {isLoadingRealData ? (
          <>
            {skeletonKpiCount > 0 && (
              <div className={`grid gap-4 ${kpiGridClass(skeletonKpiCount)}`}>
                {Array.from({ length: skeletonKpiCount }).map((_, i) => (
                  <ShimmerCard key={i} loading height={150} />
                ))}
              </div>
            )}
            <ShimmerCard loading height={320} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ShimmerCard loading height={260} />
              <ShimmerCard loading height={260} />
            </div>
          </>
        ) : blocking ? null : (
          // The section the opening's cue scrolls to. Its heading answers the
          // cue's promise, so the story continues rather than restarts.
          <div id={METRICS_ID} className="flex flex-col gap-4 sm:gap-6" style={{ scrollMarginTop: "88px" }}>
            {kpiItems.length > 0 && (
              <div className="pt-2 sm:pt-4">
                <p className="eyebrow">{locale === "sv" ? "Periodens siffror" : "This period's numbers"}</p>
                <h2
                  className="font-display"
                  style={{ fontSize: "1.35rem", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, color: "var(--text-primary)", marginTop: "4px" }}
                >
                  {locale === "sv" ? "Vad som driver resultatet" : "What drives the result"}
                </h2>
              </div>
            )}
            {kpiItems.length > 0 && (
              <div className={`grid gap-4 ${kpiGridClass(kpiItems.length)}`}>
                {kpiItems.map((item, index) => (
                  <KpiCard key={item.itemId} item={item} data={activeData} index={index} loading={false} animateNumbers={animateNumbers} />
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
          </div>
        )}

        {dashboard.nudge && !isLoadingRealData && !blocking && (
          <Notice tone="neutral" cta={{ href: "/integrations", label: t.dashboard.nudge.link }} reduced={reduced}>
            {dashboard.nudge.message}
          </Notice>
        )}

      </main>
    </div>
  );
}
