"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
} from "lucide-react";
import { KeyboardHints } from "@/components/report/KeyboardHints";
import type { AiInsightsPayload } from "@/lib/ai-insights/types";
import type { ReportData } from "@/types/schema";
import { HINTS_BAR_SPACE, slideGap } from "@/components/report/tokens";
import { buildSlideData } from "@/components/report/slide-data";
import { buildSlides } from "@/components/report/slide-list";
import { useCardScale } from "@/components/report/layout/useCardScale";
import { SlideCard } from "@/components/report/layout/SlideCard";
import { MobileReportDeck } from "@/components/report/MobileReportDeck";
import { usePortraitReport } from "@/components/report/usePortraitReport";

export function SharedReportClient({
  reportData,
  aiInsights,
}: {
  reportData: ReportData;
  aiInsights: AiInsightsPayload | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [isFs, setIsFs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Fullscreen needs no scale branch: it grows the scroll viewport, which the
  // hook already observes, so the card grows on its own.
  const { scale, edgePad } = useCardScale(containerRef, scrollRef);
  const gap = slideGap(scale);

  const isPortrait = usePortraitReport();

  const slideData = useMemo(() => buildSlideData(reportData), [reportData]);
  const slides = useMemo(
    () => buildSlides(slideData, reportData, aiInsights),
    [slideData, reportData, aiInsights],
  );
  const total = slides.length;

  // Stable per-index ref callbacks so the memoized SlideCard isn't handed a
  // fresh innerRef identity (which would defeat React.memo) on every render.
  const setCardRefs = useMemo(
    () => slides.map((_, i) => (el: HTMLDivElement | null) => { cardRefs.current[i] = el; }),
    [slides],
  );

  useEffect(() => {
    if (isPortrait) return;
    const els = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const center = window.innerHeight / 2;
        let best = visible[0];
        let bestDist = Infinity;
        for (const e of visible) {
          const rect = e.boundingClientRect;
          const mid = rect.top + rect.height / 2;
          const dist = Math.abs(mid - center);
          if (dist < bestDist) {
            bestDist = dist;
            best = e;
          }
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

  const scrollToIndex = useCallback((i: number) => {
    const el = cardRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Reads the current index from a ref so the listener isn't torn down and
  // re-added on every scroll transition.
  useEffect(() => {
    if (isPortrait) return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndexRef.current + 1, total - 1));
      } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndexRef.current - 1, 0));
      } else if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, scrollToIndex, isPortrait]);

  // Tracked only to label the button; the card scale recomputes itself from
  // the resized viewport.
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

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[oklch(0.965_0.005_270)] text-foreground print:bg-white" style={{ overscrollBehavior: "auto" }}>
      <header style={isPortrait ? { paddingTop: "max(0.5rem, env(safe-area-inset-top))" } : undefined} className={isPortrait ? "z-20 flex min-h-16 shrink-0 items-center justify-between gap-3 px-4 pb-2 print:hidden" : "z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 print:hidden sm:px-6 lg:h-12 lg:min-h-12 lg:flex-nowrap"}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="inline-flex min-h-11 items-center rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-semibold text-foreground sm:min-h-9">
            Clarix
          </span>
          {!isPortrait && <span className="tabular-nums text-xs text-foreground/50">{activeIndex + 1} / {total}</span>}
        </div>

        <div className={isPortrait ? "min-w-0 truncate text-right text-xs font-medium text-foreground/50" : "order-3 w-full text-center text-xs font-medium text-foreground/50 sm:order-none sm:w-auto"}>
          {reportData.meta.period.label}
        </div>

        {!isPortrait && (
          <button
            onClick={togglePresent}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {isFs ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {isFs ? "Avsluta" : "Present"}
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none", overscrollBehaviorY: "auto" }}
      >
        <div ref={containerRef} className="mx-auto w-full">
          {isPortrait ? (
            <MobileReportDeck data={slideData} reportData={reportData} aiInsights={aiInsights} />
          ) : (
            /* Top pad is the card's own centering offset, not the slide gap, so
               a shared link opens with slide one centered in the viewport. */
            <div
              className="flex flex-col items-center"
              style={{ gap, paddingTop: edgePad, paddingBottom: edgePad + HINTS_BAR_SPACE }}
            >
              {slides.map((slide, i) => (
                <SlideCard
                  key={slide.id}
                  slide={slide}
                  scale={scale}
                  innerRef={setCardRefs[i]}
                />
              ))}
            </div>
          )}
        </div>

        {!isPortrait && (
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
        )}
      </div>

      {!isPortrait && (
        <div className="fixed bottom-9 left-1/2 z-20 -translate-x-1/2 print:hidden">
          <KeyboardHints />
        </div>
      )}
    </div>
  );
}
