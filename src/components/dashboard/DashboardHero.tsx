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
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { AI_GRADIENT, AI_SHADOW, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER, AI_SHIMMER } from "@/components/report/tokens";

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
  const headline = aiInsights?.dashboard_hero?.headline ?? FALLBACK_TEXT;
  const sub = aiInsights?.dashboard_hero?.sub ?? null;
  const noData = aiInsights?.dashboard_hero === null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={HERO_ENTER}
      className="relative overflow-hidden rounded-[1.4rem] p-5 sm:rounded-[2rem] sm:p-10 lg:p-16"
      style={{ background: AI_GRADIENT, boxShadow: AI_SHADOW.replace(/_/g, " "), border: `1px solid ${AI_BORDER}` }}
    >
      <div className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-32 -right-10 h-96 w-96 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5), transparent 70%)" }} />
      <svg aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-0" width="500" height="500" viewBox="0 0 500 500" fill="none">
        <circle cx="250" cy="250" r="120" stroke="oklch(0.62 0.22 295)" strokeWidth="1.5" opacity="0.25" />
        <circle cx="250" cy="250" r="180" stroke="oklch(0.62 0.22 295)" strokeWidth="1" opacity="0.15" />
        <circle cx="250" cy="250" r="240" stroke="oklch(0.62 0.22 295)" strokeWidth="0.75" opacity="0.08" />
      </svg>
      <NoiseTexture preset="fine" blendMode="soft-light" opacity={0.45} />
      {loading && <ShimmerOverlay />}

      <div className="relative z-10 grid grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-12">
        {/* Left: headline only */}
        <div className="lg:col-span-5">
          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="h-8 w-[90%] rounded-full" style={{ background: AI_SHIMMER }} />
              <div className="h-8 w-[70%] rounded-full" style={{ background: AI_SHIMMER }} />
            </div>
          ) : (
            <h2
              className="font-display text-[2.15rem] leading-[1.08] tracking-tight sm:text-5xl md:text-[3rem] md:leading-[1.05]"
              style={{ color: "oklch(0.2 0.04 290)" }}
            >
              {highlightNumbers(headline, "light")}
            </h2>
          )}
        </div>

        {/* Right: "Denna vecka" label outside card + white glass card */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "oklch(0.62 0.22 295)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "oklch(0.45 0.18 290)" }}>
              Denna vecka
            </p>
          </div>
          <div
            className="rounded-2xl p-5 backdrop-blur-sm shadow-[0_20px_50px_-20px_rgba(139,92,246,0.15)] sm:p-7 lg:p-9"
            style={{ background: "oklch(1 0 0 / 0.7)", border: "1px solid oklch(0.78 0.06 295 / 0.4)" }}
          >

            {loading ? (
              <div className="mt-5 flex flex-col gap-2.5" aria-label="AI-insikt laddas">
                <div className="h-6 w-[90%] rounded-full" style={{ background: AI_SHIMMER }} />
                <div className="h-6 w-[78%] rounded-full" style={{ background: AI_SHIMMER }} />
                <div className="h-6 w-[60%] rounded-full" style={{ background: AI_SHIMMER }} />
              </div>
            ) : (
              <>
                <p
                  className="mt-5 text-[1.25rem] font-medium leading-[1.45] tracking-normal sm:text-[1.7rem]"
                  style={{ color: "rgba(30,20,60,0.9)" }}
                >
                  {!noData && sub
                    ? highlightNumbers(sub, "light")
                    : highlightNumbers(headline, "light")
                  }
                </p>
                <div className="mt-7">
                  <Link
                    href={reportHref}
                    className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-sm transition hover:bg-white/80"
                    style={{ color: "oklch(0.35 0.15 290)", textDecoration: "none" }}
                  >
                    {t.dashboard.hero.readReport}
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
