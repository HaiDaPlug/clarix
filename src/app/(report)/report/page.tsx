"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Share2,
} from "lucide-react";
import { KeyboardHints } from "@/components/report/KeyboardHints";
import { useDateRange } from "@/lib/google/date-presets";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import { useAiInsights } from "@/lib/hooks/useAiInsights";
import type { ReportData } from "@/types/schema";
import type { ReportDataBuildResult } from "@/lib/report-data/server";
import type { ClientWorkspace } from "@/lib/clients/types";
import { propertyKeyFor, readReportSnapshot, writeReportSnapshot } from "@/lib/report-snapshot";
import { CANVAS_W, CANVAS_H, HINTS_BAR_SPACE, slideGap } from "@/components/report/tokens";
import { SlideShimmer } from "@/components/report/primitives/Shimmer";
import { buildSlideData } from "@/components/report/slide-data";
import { buildSlides } from "@/components/report/slide-list";
import { useCardScale } from "@/components/report/layout/useCardScale";
import { SlideCard } from "@/components/report/layout/SlideCard";
import { MobileReportDeck, MobileReportLoading } from "@/components/report/MobileReportDeck";
import { usePortraitReport } from "@/components/report/usePortraitReport";

/* Page */

export default function ReportPage() {
  return (
    <Suspense>
      <ReportPageInner />
    </Suspense>
  );
}

type EmptyState = "no_sources" | "reconnect_required" | "unavailable" | "no_data";

function ReportPageInner() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  // The workspace this deck shows: resolved once from the user's preference,
  // then named explicitly on every request. undefined = not resolved yet.
  const [workspaceId, setWorkspaceId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emptyState, setEmptyState] = useState<EmptyState | null>(null);
  const noSources = emptyState !== null;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [isFs, setIsFs] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const reportDataRef = useRef<ReportData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Fullscreen needs no scale branch: it grows the scroll viewport, which the
  // hook already observes, so the card grows on its own.
  const { scale, edgePad } = useCardScale(containerRef, scrollRef);
  const gap = slideGap(scale);
  const dateRange = useDateRange();
  const rangeStart = dateRange.startDate;
  const rangeEnd = dateRange.endDate;
  const isPortrait = usePortraitReport();

  const periodLabel = reportData?.meta?.period?.label ?? "Senaste perioden";
  // Insights follow the period baked into the rendered data, not the URL range:
  // while stale slides stay visible during a range change, the hook's dedup key
  // stays unchanged instead of firing an extra generation for (new period +
  // stale data). It still fires exactly once per period + data fingerprint.
  const { insights: aiInsights, loading: aiInsightsLoading } = useAiInsights(
    reportData,
    workspaceId ?? null,
    reportData?.meta?.period?.startDate ?? dateRange.startDate,
    reportData?.meta?.period?.endDate ?? dateRange.endDate,
    periodLabel,
  );

  // Resolve which workspace to show, once per mount.
  useEffect(() => {
    let cancelled = false;
    async function resolveWorkspace() {
      try {
        const res = await fetch("/api/clients/active", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          window.location.assign("/login");
          return;
        }
        const payload = res.ok ? ((await res.json()) as { client: ClientWorkspace | null }) : { client: null };
        if (!cancelled) setWorkspaceId(payload.client?.id ?? null);
      } catch {
        if (!cancelled) setWorkspaceId(null);
      }
    }
    void resolveWorkspace();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (workspaceId === undefined) return;
    let cancelled = false;

    async function load() {
      setEmptyState(null);

      const fail = (state: EmptyState) => {
        reportDataRef.current = null;
        setReportData(null);
        setEmptyState(state);
        setLoading(false);
        setRefreshing(false);
      };

      // Narrowed copy: the closure cannot see the effect-level undefined check.
      const id = workspaceId;
      if (!id) {
        fail("no_sources");
        return;
      }

      // Stale-while-revalidate: a session snapshot for THIS workspace and
      // range paints immediately; otherwise slides from the previous range
      // stay up while the new range fetches. Shimmer only on a true cold load.
      const snapshot = readReportSnapshot(id, rangeStart, rangeEnd);
      if (snapshot) {
        reportDataRef.current = snapshot.data;
        setReportData(snapshot.data);
        setLoading(false);
        setRefreshing(true);
      } else if (reportDataRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let result: ReportDataBuildResult;
      try {
        const res = await fetch("/api/report-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: id,
            dateRange: { startDate: rangeStart, endDate: rangeEnd },
            periodLabel: fmtDateRange(rangeStart, rangeEnd),
            locale: "sv",
          }),
        });
        if (cancelled) return;
        if (res.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (res.status === 404) {
          // Workspace deleted elsewhere.
          fail("no_sources");
          return;
        }
        if (!res.ok) {
          fail("unavailable");
          return;
        }
        result = (await res.json()) as ReportDataBuildResult;
      } catch {
        if (!cancelled) fail("unavailable");
        return;
      }

      if (cancelled) return;

      if (result.status === "no_sources") { fail("no_sources"); return; }
      if (result.status === "reconnect_required") { fail("reconnect_required"); return; }
      if (result.status === "unavailable") { fail("unavailable"); return; }
      if (result.status === "no_data") { fail("no_data"); return; }

      reportDataRef.current = result.data;
      setReportData(result.data);
      setLoading(false);
      setRefreshing(false);
      writeReportSnapshot(
        { workspaceId: result.workspace.id, propertyKey: propertyKeyFor(result.sources) },
        rangeStart,
        rangeEnd,
        result.data,
      );
    }

    load();
    return () => { cancelled = true; };
  }, [workspaceId, rangeStart, rangeEnd]);

  const slideData = useMemo(() => buildSlideData(reportData), [reportData]);
  const slides = useMemo(
    () => buildSlides(slideData, reportData, aiInsights),
    [slideData, reportData, aiInsights],
  );
  const total = slides.length;

  // Stable per-index ref callbacks so the memoized SlideCard isn't handed a
  // fresh innerRef identity (which would defeat React.memo) on every render.
  const setCardRefs = useMemo(
    () => slides.map((_, index) => (element: HTMLDivElement | null) => { cardRefs.current[index] = element; }),
    [slides],
  );

  // Track which slide is in view via IntersectionObserver
  useEffect(() => {
    if (isPortrait) return;
    const els = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Pick the one closest to center
        const center = window.innerHeight / 2;
        let best = visible[0];
        let bestDist = Infinity;
        for (const e of visible) {
          const rect = e.boundingClientRect;
          const mid = rect.top + rect.height / 2;
          const dist = Math.abs(mid - center);
          if (dist < bestDist) { bestDist = dist; best = e; }
        }
        const idx = els.indexOf(best.target as HTMLDivElement);
        if (idx !== -1) {
          activeIndexRef.current = idx;
          setActiveIndex(idx);
        }
      },
      { threshold: 0.5 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slides, isPortrait]);

  // Scroll to a card by index
  const scrollToIndex = useCallback((i: number) => {
    const el = cardRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Arrow keys / space scroll one card. Reads the current index from a ref so
  // the listener isn't torn down and re-added on every scroll transition.
  useEffect(() => {
    if (isPortrait) return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndexRef.current + 1, total - 1));
      } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndexRef.current - 1, 0));
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else window.history.back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, scrollToIndex, isPortrait]);

  // Fullscreen — tracked only to label the button; the card scale recomputes
  // itself from the resized viewport.
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePresent = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleShare = useCallback(async () => {
    if (!reportData || !workspaceId) return;

    setShareLoading(true);
    setShareCopied(false);
    setShareFailed(false);

    try {
      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: workspaceId,
          period: {
            start: dateRange.startDate,
            end: dateRange.endDate,
            label: periodLabel,
          },
        }),
      });

      if (!res.ok) throw new Error("Share request failed");

      const json = await res.json() as { url?: string; absoluteUrl?: string };
      const shareUrl = json.absoluteUrl ?? (json.url ? new URL(json.url, window.location.origin).toString() : null);
      if (!shareUrl) throw new Error("Missing share URL");

      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2500);
    } catch (error) {
      console.error("[report] share failed", error);
      setShareFailed(true);
      window.setTimeout(() => setShareFailed(false), 2500);
    } finally {
      setShareLoading(false);
    }
  }, [dateRange.endDate, dateRange.startDate, periodLabel, reportData, workspaceId]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[oklch(0.965_0.005_270)] text-foreground print:bg-white" style={{ overscrollBehavior: "auto" }}>
      {/* Top bar */}
      <header style={isPortrait ? { paddingTop: "max(0.5rem, env(safe-area-inset-top))" } : undefined} className={isPortrait ? "z-20 flex min-h-16 shrink-0 items-center gap-2 px-4 pb-2 print:hidden" : "z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 print:hidden sm:px-6 lg:h-12 lg:min-h-12 lg:flex-nowrap"}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:min-h-9">
            <ArrowLeft className="h-3 w-3" />
            Avsluta
          </Link>
          {!isPortrait && <span className="tabular-nums text-xs text-foreground/50">{activeIndex + 1} / {total}</span>}
        </div>
        <div className={isPortrait ? "min-w-0 flex-1" : "order-3 w-full sm:order-none sm:w-auto"}>
          <DateRangePicker locale="sv" loading={refreshing} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} disabled={shareLoading || !reportData} aria-label={shareLoading ? "Skapar delningslänk" : shareCopied ? "Länk kopierad" : "Dela rapport"} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 sm:min-h-9 sm:min-w-0">
            <Share2 className="h-3 w-3" /><span className={isPortrait ? "sr-only" : ""}>{shareLoading ? "Skapar..." : shareCopied ? "Kopierat!" : shareFailed ? "Fel" : "Dela"}</span>
          </button>
          {!isPortrait && (
            <button onClick={togglePresent} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              {isFs ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}{isFs ? "Avsluta" : "Present"}
            </button>
          )}
        </div>
      </header>
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none", overscrollBehaviorY: "auto" }}>
        <div ref={containerRef} className="mx-auto w-full">
          {!loading && emptyState && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center" role={emptyState === "unavailable" ? "alert" : "status"}>
              <p className="font-display text-2xl font-bold" style={{ letterSpacing: "-0.02em" }}>{EMPTY_COPY[emptyState].title}<span style={{ color: "var(--brand-coral)" }}>.</span></p>
              <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{EMPTY_COPY[emptyState].body}</p>
              {EMPTY_COPY[emptyState].action === "reload" ? (
                <button onClick={() => window.location.reload()} className="btn btn-primary mt-2">{EMPTY_COPY[emptyState].cta}</button>
              ) : (
                <Link href="/integrations" className="btn btn-primary mt-2">{EMPTY_COPY[emptyState].cta}</Link>
              )}
            </div>
          )}
          {isPortrait && loading && <MobileReportLoading />}
          {isPortrait && !loading && reportData && !noSources && <MobileReportDeck data={slideData} reportData={reportData} aiInsights={aiInsights} aiLoading={aiInsightsLoading} />}
          {!isPortrait && (
            /* Top pad is the card's own centering offset, not the slide gap:
               the deck opens with slide one centered in the viewport instead of
               flush under the header with its lower half cut off. */
            <div className="flex flex-col items-center" style={{ gap, paddingTop: edgePad, paddingBottom: edgePad + HINTS_BAR_SPACE }}>
              {loading ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} style={{ height: CANVAS_H * scale, width: CANVAS_W * scale, borderRadius: 6, overflow: "hidden", background: "#ffffff", boxShadow: "0 2px 4px rgba(20,18,16,0.04), 0 12px 40px rgba(20,18,16,0.08)", border: "1px solid rgba(20,18,16,0.05)", flexShrink: 0 }}>
                  <div style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: "top left", padding: "48px 64px" }}><SlideShimmer /></div>
                </div>
              )) : !noSources && slides.map((slide, index) => (
                <SlideCard key={slide.id} slide={slide} scale={scale} innerRef={setCardRefs[index]} />
              ))}
            </div>
          )}
        </div>
        {!isPortrait && (
          <div className="fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-[7px] print:hidden sm:flex lg:right-4">
            {slides.map((slide, index) => (
              <button key={slide.id} onClick={() => scrollToIndex(index)} aria-label={slide.title} className="rounded-full transition-all duration-300" style={{ width: 5, height: index === activeIndex ? 22 : 5, background: index === activeIndex ? "oklch(0.35 0.01 270 / 0.7)" : "oklch(0.5 0.01 270 / 0.3)" }} />
            ))}
          </div>
        )}
      </div>
      {!isPortrait && <div className="fixed bottom-9 left-1/2 z-20 -translate-x-1/2 print:hidden"><KeyboardHints /></div>}
    </div>
  );
}

const MONTHS_SV = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];

function fmtDateRange(startIso: string, endIso: string): string {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = `${sd} ${MONTHS_SV[sm - 1]}`;
  const end = `${ed} ${MONTHS_SV[em - 1]} ${ey}`;
  return sy === ey ? `${start} – ${end}` : `${start} ${sy} – ${end}`;
}

// Each empty state says exactly what is true and offers one next step. None
// of them shows sample data.
const EMPTY_COPY: Record<EmptyState, { title: string; body: string; cta: string; action: "integrations" | "reload" }> = {
  no_sources: {
    title: "Ingen datakälla kopplad",
    body: "Koppla ihop Google Analytics eller Search Console under Integrationer för att se din rapport.",
    cta: "Gå till Integrationer",
    action: "integrations",
  },
  reconnect_required: {
    title: "Google-åtkomsten behöver förnyas",
    body: "Dina valda egendomar finns kvar. Anslut Google igen under Integrationer så hämtas rapporten.",
    cta: "Anslut Google igen",
    action: "integrations",
  },
  unavailable: {
    title: "Google svarade inte just nu",
    body: "Din anslutning är oförändrad. Försök igen om en stund.",
    cta: "Försök igen",
    action: "reload",
  },
  no_data: {
    title: "Ingen data för den här perioden",
    body: "Google gav inga siffror för den valda perioden. Prova en annan period, eller kontrollera egendomen under Integrationer.",
    cta: "Gå till Integrationer",
    action: "integrations",
  },
};
