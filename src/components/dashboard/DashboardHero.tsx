"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { NoiseTexture } from "@/components/ui/noise-texture";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import { FALLBACK_TEXT } from "@/lib/hooks/useAiInsights";
import { ShimmerOverlay } from "@/components/primitives/ShimmerCard";
import { withPeriod } from "@/lib/utils/text";

// Splits a string on numeric tokens (e.g. "1 234", "87%", "3,5x") and wraps
// each number in a bright green span so visit counts pop on the gradient card.
// Matches: optional leading sign, digits with Swedish thousand-space separators,
// optional decimal comma/period, optional trailing % or x.
// Split pattern — capturing group means the matched tokens are kept in the array.
const NUM_SPLIT = /([+-]?\d[\d\s]*(?:[,.]\d+)?(?:\s*[%x])?)/g;
// Test pattern — separate instance to avoid stateful lastIndex issues.
const NUM_TEST = /^[+-]?\d[\d\s]*(?:[,.]\d+)?(?:\s*[%x])?$/;

function highlightNumbers(text: string) {
  const parts = text.split(NUM_SPLIT);
  return parts.map((part, i) =>
    NUM_TEST.test(part) ? (
      <span key={i} style={{ color: "#6EF5A8", fontWeight: 700 }}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

const HERO_ENTER = { duration: 0.5, ease: [0.0, 0.0, 0.2, 1] as const, delay: 0 };

export function DashboardHero({
  data,
  aiInsights,
  loading,
}: {
  data: ReportData;
  aiInsights: AiInsightsPayload | null;
  loading: boolean;
}) {
  const { t } = useLocale();
  const params = useSearchParams();
  const summary = data.executiveSummary;
  if (!summary) return null;

  const reportHref = `/report${params.toString() ? `?${params.toString()}` : ""}`;
  const headline = aiInsights?.dashboard_hero?.headline
    ? withPeriod(aiInsights.dashboard_hero.headline)
    : FALLBACK_TEXT;
  const sub = aiInsights?.dashboard_hero?.sub
    ? withPeriod(aiInsights.dashboard_hero.sub)
    : null;
  const noData = aiInsights?.dashboard_hero === null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={HERO_ENTER}
      className="relative overflow-hidden rounded-3xl border border-white/20 p-8 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)] sm:p-10"
      style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
    >
      <NoiseTexture preset="cinematic" blendMode="overlay" />
      {loading && <ShimmerOverlay />}
      <div className="relative z-10 flex flex-col">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.7)" }}>
            {loading ? "Analyserar data" : "Insikter från proffset"}
          </p>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>—</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.7)" }}>
            {data.meta.period.label}
          </span>
        </div>

        {loading ? (
          <div className="mt-6 flex flex-col gap-3" aria-label="AI-insikt laddas">
            <div className="h-9 w-[82%] rounded-full bg-white/35" />
            <div className="h-9 w-[58%] rounded-full bg-white/25" />
            <div className="mt-3 h-5 w-[70%] rounded-full bg-white/20" />
          </div>
        ) : (
          <>
            <p className="mt-5 text-[2rem] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[2.4rem]" style={{ color: "rgba(255,255,255,0.95)" }}>
              <span className="relative inline">
                {highlightNumbers(headline)}
                {!noData && (
                  <svg
                    viewBox="0 0 300 10"
                    preserveAspectRatio="none"
                    aria-hidden
                    className="absolute left-0 right-0"
                    style={{ bottom: "-10px", height: "10px", width: "100%" }}
                  >
                    <path
                      d="M0,6 C20,1 40,9 60,5 C80,1 100,9 120,5 C140,1 160,9 180,5 C200,1 220,9 240,5 C260,1 280,9 300,5"
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </span>
            </p>

            {!noData && sub && (
              <p className="mt-6 text-lg font-normal leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                {highlightNumbers(sub)}
              </p>
            )}
          </>
        )}

        <div className="mt-7">
          <Link
            href={reportHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-white"
            style={{ color: "oklch(0.35 0.15 290)", textDecoration: "none" }}
          >
            {t.dashboard.hero.readReport}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
