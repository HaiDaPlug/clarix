"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Share2,
} from "lucide-react";
import { KeyboardHints } from "@/components/report/KeyboardHints";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  ConnectableSource,
  ConnectedSource,
  mergeReportData,
} from "@/lib/google/connected-sources";
import { useDateRange, DATE_PRESETS, presetToRange, type DatePresetId } from "@/lib/google/date-presets";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import { useAiInsights } from "@/lib/hooks/useAiInsights";
import type { ReportData } from "@/types/schema";
import { CANVAS_W, CANVAS_H, SLIDE_GAP } from "@/components/report/tokens";
import { SlideShimmer } from "@/components/report/primitives/Shimmer";
import { buildSlideData } from "@/components/report/slide-data";
import { buildSlides } from "@/components/report/slide-list";
import { useCardScale } from "@/components/report/layout/useCardScale";
import { SlideCard } from "@/components/report/layout/SlideCard";

const FULLSCREEN_SCALE_BUMP = 1.04;

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
  const [noSources, setNoSources] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const [presentationScale, setPresentationScale] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { scale } = useCardScale(containerRef, scrollRef);
  const viewerScale = isFs && presentationScale !== null
    ? Math.min(scale, presentationScale * FULLSCREEN_SCALE_BUMP)
    : scale;
  const dateRange = useDateRange();
  const router = useRouter();

  const periodLabel = reportData?.meta?.period?.label ?? "Senaste perioden";
  const { insights: aiInsights } = useAiInsights(
    reportData,
    userId,
    dateRange.startDate,
    dateRange.endDate,
    periodLabel,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNoSources(false);
      setReportData(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"])
        .neq("property_id", "_pending");

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setNoSources(true);
        setLoading(false);
        return;
      }

      const sources = data.filter(
        (s): s is ConnectedSource => s.source === "ga4" || s.source === "gsc",
      );

      if (sources.length === 0) {
        setNoSources(true);
        setLoading(false);
        return;
      }

      let ga4WebsiteUri: string | null = null;

      const parts = await Promise.all(
        sources.map(async (source) => {
          try {
            const endpoint = source.source === "ga4" ? "/api/ga4" : "/api/gsc";
            const body = source.source === "ga4"
              ? { propertyId: source.property_id, dateRange, locale: "sv" }
              : { siteUrl: source.property_id, dateRange, locale: "sv" };
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
        setNoSources(true);
        setLoading(false);
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
      const resolvedPeriodLabel = fmtDateRange(dateRange.startDate, dateRange.endDate);
      merged.meta = {
        ...merged.meta,
        ...(sourceName ? { clientName: sourceName } : {}),
        ...(clientDomain ? { clientDomain } : {}),
        period: { label: resolvedPeriodLabel, startDate: dateRange.startDate, endDate: dateRange.endDate },
      };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) setUserId(user.id);

      setReportData(merged);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [dateRange.startDate, dateRange.endDate]);

  const slideData = useMemo(() => buildSlideData(reportData), [reportData]);
  const slides = useMemo(
    () => buildSlides(slideData, reportData, aiInsights),
    [slideData, reportData, aiInsights],
  );
  const total = slides.length;

  // Track which slide is in view via IntersectionObserver
  useEffect(() => {
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
        if (idx !== -1) setActiveIndex(idx);
      },
      { threshold: 0.5 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slides]);

  // Scroll to a card by index
  const scrollToIndex = useCallback((i: number) => {
    const el = cardRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Arrow keys / space scroll one card
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, total - 1));
      } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else window.history.back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, total, scrollToIndex]);

  // Fullscreen
  useEffect(() => {
    const onFs = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFs(fullscreen);
      if (fullscreen) {
        setPresentationScale((current) => current ?? scale);
      } else {
        setPresentationScale(null);
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [scale]);

  const togglePresent = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      setPresentationScale(scale);
      const request = el.requestFullscreen?.();
      if (request) void request.catch(() => setPresentationScale(null));
    } else {
      document.exitFullscreen?.();
    }
  };

  // Date preset picker - sets ?from=&to= on URL
  const applyPreset = (id: DatePresetId) => {
    const r = presetToRange(id);
    router.push(`?from=${r.startDate}&to=${r.endDate}`);
    setShowDatePicker(false);
  };

  const currentLabel = DATE_PRESETS.find((p) => {
    const r = presetToRange(p.id);
    return r.startDate === dateRange.startDate && r.endDate === dateRange.endDate;
  })?.labelSv ?? `${dateRange.startDate} – ${dateRange.endDate}`;

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
      <header className="z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 print:hidden sm:px-6 lg:h-12 lg:min-h-12 lg:flex-nowrap">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-3 w-3" />
            Avsluta
          </Link>
          <span className="tabular-nums text-xs text-foreground/50">{activeIndex + 1} / {total}</span>
        </div>

        {/* Date picker */}
        <div className="relative order-3 w-full sm:order-none sm:w-auto">
          <button
            onClick={() => setShowDatePicker((v) => !v)}
            className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            {currentLabel}
            <ArrowRight className="h-3 w-3 rotate-90" />
          </button>
          {showDatePicker && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl sm:w-48"
              onMouseLeave={() => setShowDatePicker(false)}
            >
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors font-medium"
                  style={{ color: p.id === (DATE_PRESETS.find(x => presetToRange(x.id).startDate === dateRange.startDate)?.id) ? "#FF6B55" : undefined }}
                >
                  {p.labelSv}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={shareLoading || !reportData}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Share2 className="h-3 w-3" />
            {shareLoading ? "Skapar..." : shareCopied ? "Kopierat!" : shareFailed ? "Fel" : "Dela"}
          </button>

          <button
            onClick={togglePresent}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {isFs ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {isFs ? "Avsluta" : "Present"}
          </button>
        </div>
      </header>

      {/* Scroll surface */}
      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none", overscrollBehaviorY: "auto" }}
      >
        <div ref={containerRef} className="mx-auto w-full px-2 sm:px-5 lg:px-8 2xl:px-12">

          {/* No sources state */}
          {!loading && noSources && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-center">
              <p className="text-2xl font-display font-bold">Ingen data för den här perioden<span style={{ color: "#FF6B55" }}>.</span></p>
              <p className="text-sm text-foreground/60 max-w-sm">Koppla ihop Google Analytics eller Search Console under Integrationer för att se din rapport.</p>
              <Link href="/integrations" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "#FF6B55" }}>
                Gå till Integrationer
              </Link>
            </div>
          )}

          <div
            className="flex flex-col items-center"
            style={{ gap: SLIDE_GAP, paddingTop: SLIDE_GAP, paddingBottom: SLIDE_GAP }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: CANVAS_H * viewerScale,
                      width: CANVAS_W * viewerScale,
                      borderRadius: 6,
                      overflow: "hidden",
                      background: "#ffffff",
                      boxShadow: "0 2px 4px rgba(20,18,16,0.04), 0 12px 40px rgba(20,18,16,0.08)",
                      border: "1px solid rgba(20,18,16,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: CANVAS_W,
                        height: CANVAS_H,
                        transform: `scale(${viewerScale})`,
                        transformOrigin: "top left",
                        padding: "48px 64px",
                      }}
                    >
                      <SlideShimmer />
                    </div>
                  </div>
                ))
              : !noSources && slides.map((slide, i) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    scale={viewerScale}
                    innerRef={(el) => { cardRefs.current[i] = el; }}
                  />
                ))
            }
          </div>
        </div>

        {/* Dot nav - fixed right edge */}
        <div className="fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-[7px] print:hidden sm:flex lg:right-4">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollToIndex(i)}
              aria-label={s.title}
              className="rounded-full transition-all duration-300"
              style={{
                width: 5,
                height: i === activeIndex ? 22 : 5,
                background: i === activeIndex
                  ? "oklch(0.35 0.01 270 / 0.7)"
                  : "oklch(0.5 0.01 270 / 0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 print:hidden">
        <KeyboardHints />
      </div>
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
