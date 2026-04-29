"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { AssembledDeck } from "@/types/modules";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

interface ReportViewerProps {
  deck: AssembledDeck;
}

export function ReportViewer({ deck }: ReportViewerProps) {
  const { t } = useLocale();
  const [currentSlide, setCurrentSlide] = useState(0);
  const total = deck.slides.length;
  const router = useRouter();

  const goNext = useCallback(() => {
    setCurrentSlide((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentSlide((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "Escape") {
        router.push("/dashboard");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, router]);

  const slide = deck.slides[currentSlide];
  const SlideComponent = slide.module.component;

  return (
    <div className="relative w-full min-h-dvh overflow-hidden">

      {/* Exit button — top right */}
      <div className="fixed top-5 right-6 z-50">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:opacity-70"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "var(--slate)",
            backgroundColor: "rgba(245,243,239,0.7)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--rule)",
          }}
          aria-label={t.viewer.exit}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {t.viewer.exit}
        </button>
      </div>

      {/* Slide content — max readable width, centered */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl mx-auto"
        >
          <Suspense
            fallback={
              <div className="slide flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[var(--rule)] animate-pulse" />
              </div>
            }
          >
            <SlideComponent
              data={deck.reportData}
              variant={slide.eligibility.variant}
              isActive
              slideIndex={currentSlide}
              totalSlides={total}
            />
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar — slide counter left, dots center, nav right */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex items-center justify-between px-8">

        {/* Slide counter */}
        <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--slate-light)" }}>
          {currentSlide + 1} / {total}
        </p>

        {/* Dot indicators — center */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {deck.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "transition-all duration-300 rounded-full",
                i === currentSlide
                  ? "w-4 h-1.5 bg-[var(--charcoal)]"
                  : "w-1.5 h-1.5 bg-[var(--rule)] hover:bg-[var(--slate-light)]"
              )}
              aria-label={t.viewer.goToSlide(i + 1)}
            />
          ))}
        </div>

        {/* Prev / Next arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className="w-7 h-7 border border-[var(--rule)] rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ backgroundColor: "rgba(245,243,239,0.8)", backdropFilter: "blur(8px)" }}
            aria-label={t.viewer.prevSlide}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 9V1M1 4l4-4 4 4" stroke="var(--charcoal)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={goNext}
            disabled={currentSlide === total - 1}
            className="w-7 h-7 border border-[var(--rule)] rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ backgroundColor: "rgba(245,243,239,0.8)", backdropFilter: "blur(8px)" }}
            aria-label={t.viewer.nextSlide}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 6l4 4 4-4" stroke="var(--charcoal)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
