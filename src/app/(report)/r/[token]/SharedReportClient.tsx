"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { AiInsightsPayload } from "@/lib/ai-insights/types";
import type { ReportData } from "@/types/schema";
import { SLIDE_GAP } from "@/components/report/tokens";
import { buildSlideData } from "@/components/report/slide-data";
import { buildSlides } from "@/components/report/slide-list";
import { useCardScale } from "@/components/report/layout/useCardScale";
import { SlideCard } from "@/components/report/layout/SlideCard";

export function SharedReportClient({
  reportData,
  aiInsights,
}: {
  reportData: ReportData;
  aiInsights: AiInsightsPayload | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { scale } = useCardScale(containerRef);

  const slideData = useMemo(() => buildSlideData(reportData), [reportData]);
  const slides = useMemo(
    () => buildSlides(slideData, reportData, aiInsights),
    [slideData, reportData, aiInsights],
  );
  const total = slides.length;

  useEffect(() => {
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
        if (idx !== -1) setActiveIndex(idx);
      },
      { threshold: 0.5 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slides]);

  const scrollToIndex = useCallback((i: number) => {
    const el = cardRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, total - 1));
      } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      } else if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, total, scrollToIndex]);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePresent = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[oklch(0.965_0.005_270)] text-foreground print:bg-white" style={{ overscrollBehavior: "auto" }}>
      <header className="z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 print:hidden sm:px-6 lg:h-12 lg:min-h-12 lg:flex-nowrap">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-semibold text-foreground">
            Clarix
          </span>
          <span className="tabular-nums text-xs text-foreground/50">{activeIndex + 1} / {total}</span>
        </div>

        <div className="order-3 w-full text-center text-xs font-medium text-foreground/50 sm:order-none sm:w-auto">
          {reportData.meta.period.label}
        </div>

        <button
          onClick={togglePresent}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          {isFs ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {isFs ? "Avsluta" : "Present"}
        </button>
      </header>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none", overscrollBehaviorY: "auto" }}
      >
        <div ref={containerRef} className="mx-auto w-full max-w-[1400px] px-2 sm:px-5 lg:px-8">
          <div
            className="flex flex-col items-center"
            style={{ gap: SLIDE_GAP, paddingTop: SLIDE_GAP, paddingBottom: SLIDE_GAP }}
          >
            {slides.map((slide, i) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                scale={scale}
                innerRef={(el) => { cardRefs.current[i] = el; }}
              />
            ))}
          </div>
        </div>

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

      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-2 backdrop-blur-md print:hidden sm:bottom-5 sm:gap-3 sm:px-4 sm:py-2.5" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <button
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-all hover:bg-black/6 disabled:opacity-25"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/40">
          <kbd className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 font-mono text-[10px]">&uarr;</kbd>
          <kbd className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 font-mono text-[10px]">&darr;</kbd>
        </div>
        <span className="tabular-nums text-xs font-medium text-foreground/50">{activeIndex + 1} / {total}</span>
        <button
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex === total - 1}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-all hover:bg-black/6 disabled:opacity-25"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
