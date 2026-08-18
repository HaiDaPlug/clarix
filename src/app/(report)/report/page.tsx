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
import { createClient } from "@/utils/supabase/client";
import {
  ConnectableSource,
  ConnectedSource,
  mergeReportData,
} from "@/lib/google/connected-sources";
import { useDateRange } from "@/lib/google/date-presets";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import { useAiInsights } from "@/lib/hooks/useAiInsights";
import type { ReportData } from "@/types/schema";
import { readReportSnapshot, writeReportSnapshot } from "@/lib/report-snapshot";
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

function ReportPageInner() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noSources, setNoSources] = useState(false);
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
  const { scale } = useCardScale(containerRef, scrollRef);
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
    userId,
    reportData?.meta?.period?.startDate ?? dateRange.startDate,
    reportData?.meta?.period?.endDate ?? dateRange.endDate,
    periodLabel,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setNoSources(false);

      // Stale-while-revalidate: a session snapshot for this range paints
      // immediately; otherwise slides from the previous range stay up while
      // the new range fetches. Shimmer only on a true cold load.
      const snapshot = readReportSnapshot(rangeStart, rangeEnd);
      if (snapshot) {
        reportDataRef.current = snapshot;
        setReportData(snapshot);
        setLoading(false);
        setRefreshing(true);
      } else if (reportDataRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const failNoSources = () => {
        reportDataRef.current = null;
        setReportData(null);
        setNoSources(true);
        setLoading(false);
        setRefreshing(false);
      };

      const supabase = createClient();
      // Kicked off here so auth resolves alongside the data fetches instead of
      // adding a serial round trip before first paint; awaited where needed.
      const userPromise = supabase.auth.getUser().catch(() => ({ data: { user: null } }));

      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"])
        .neq("property_id", "_pending");

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        failNoSources();
        return;
      }

      const sources = data.filter(
        (s): s is ConnectedSource => s.source === "ga4" || s.source === "gsc",
      );

      if (sources.length === 0) {
        failNoSources();
        return;
      }

      let ga4WebsiteUri: string | null = null;

      const parts = await Promise.all(
        sources.map(async (source) => {
          try {
            const endpoint = source.source === "ga4" ? "/api/ga4" : "/api/gsc";
            const body = source.source === "ga4"
              ? { propertyId: source.property_id, dateRange: { startDate: rangeStart, endDate: rangeEnd }, locale: "sv" }
              : { siteUrl: source.property_id, dateRange: { startDate: rangeStart, endDate: rangeEnd }, locale: "sv" };
            const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) return undefined;
            const json = await res.json() as Partial<ReportData> & { websiteUri?: string };
            if (source.source === "ga4" && json.websiteUri) ga4WebsiteUri = json.websiteUri;
            return json as Partial<ReportData>;
          } catch { return undefined; }
        }),
      );

      if (cancelled) return;

      const realParts = parts.filter((p): p is Partial<ReportData> => p !== undefined);
      if (realParts.length === 0) {
        failNoSources();
        return;
      }

      const connectedIds = sources.map((s) => s.source) as ConnectableSource[];
      const base = realParts[0] as ReportData;
      const merged = realParts.length > 1
        ? mergeReportData(base, realParts.slice(1), connectedIds)
        : { ...base, meta: { ...base.meta, availableSources: connectedIds } };
      if (!merged.executiveSummary) merged.executiveSummary = deriveExecutiveSummary(merged, "sv");

      // Inject source metadata - API routes return no meta, so we derive it here
      const ga4Source = sources.find((s) => s.source === "ga4");
      const gscSource = sources.find((s) => s.source === "gsc");
      const rawName = ga4Source?.display_name ?? gscSource?.display_name ?? null;
      const sourceName = rawName ? cleanSourceName(rawName) : null;
      // GSC property_id is always a URL/domain; GA4 property_id is a numeric ID.
      // Fall back to websiteUri from the GA4 Admin API when GSC isn't connected.
      const rawPropertyId = gscSource?.property_id ?? ga4WebsiteUri ?? null;
      const clientDomain = rawPropertyId ? extractDomain(rawPropertyId) : null;
      const resolvedPeriodLabel = fmtDateRange(rangeStart, rangeEnd);
      merged.meta = {
        ...merged.meta,
        ...(sourceName ? { clientName: sourceName } : {}),
        ...(clientDomain ? { clientDomain } : {}),
        period: { label: resolvedPeriodLabel, startDate: rangeStart, endDate: rangeEnd },
      };

      reportDataRef.current = merged;
      setReportData(merged);
      setLoading(false);
      setRefreshing(false);
      writeReportSnapshot(sources.map((s) => s.id), rangeStart, rangeEnd, merged);

      const {
        data: { user },
      } = await userPromise;
      if (!cancelled && user) setUserId(user.id);
    }

    load();
    return () => { cancelled = true; };
  }, [rangeStart, rangeEnd]);

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
    if (!reportData) return;

    setShareLoading(true);
    setShareCopied(false);
    setShareFailed(false);

    try {
      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
  }, [dateRange.endDate, dateRange.startDate, periodLabel, reportData]);

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
          {!loading && noSources && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="font-display text-2xl font-bold">Ingen data för den här perioden<span style={{ color: "#FF6B55" }}>.</span></p>
              <p className="max-w-sm text-sm text-foreground/60">Koppla ihop Google Analytics eller Search Console under Integrationer för att se din rapport.</p>
              <Link href="/integrations" className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "#FF6B55" }}>Gå till Integrationer</Link>
            </div>
          )}
          {isPortrait && loading && <MobileReportLoading />}
          {isPortrait && !loading && reportData && !noSources && <MobileReportDeck data={slideData} reportData={reportData} aiInsights={aiInsights} aiLoading={aiInsightsLoading} />}
          {!isPortrait && (
            <div className="flex flex-col items-center" style={{ gap, paddingTop: gap, paddingBottom: gap + HINTS_BAR_SPACE }}>
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

function cleanSourceName(name: string): string {
  const noise = [
    "GA4",
    "Google Analytics 4",
    "Google Analytics",
    "Analytics",
    "GSC",
    "Google Search Console",
    "Search Console",
    "Google Ads",
    "Ads",
  ];
  const pattern = noise.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(
    `(?:[\\s\\-–“|]+(?:${pattern})\\s*$|^\\s*(?:${pattern})[\\s\\-–“|]+|\\s*[\\(\\[](?:${pattern})[\\)\\]])`,
    "gi",
  );
  return name.replace(re, "").trim();
}

function extractDomain(propertyId: string): string {
  if (propertyId.startsWith("sc-domain:")) return propertyId.slice("sc-domain:".length);
  try {
    // Full URL like https://example.com/
    return new URL(propertyId).hostname.replace(/^www\./, "");
  } catch {
    // Bare hostname like "www.example.com" from GA4 hostname dimension
    return propertyId.replace(/^www\./, "");
  }
}
