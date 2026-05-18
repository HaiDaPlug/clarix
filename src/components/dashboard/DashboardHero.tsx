"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AssembledDashboardItem } from "@/types/dashboard";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";

const HERO_ENTER = { duration: 0.5, ease: [0.0, 0.0, 0.2, 1] as const, delay: 0 };

function colorizeNumbers(text: string): React.ReactNode {
  const parts = text.split(/([-+]?\d[\d\s.,]*\s*(?:%|kr|SEK|k|K|mn)?)/g);
  return parts.map((part, i) => {
    if (!/\d/.test(part)) return part;
    const isNegative = part.trimStart().startsWith("-");
    return (
      <span key={i} style={{ color: isNegative ? "#B91C1C" : "#16a34a", fontWeight: 800 }}>
        {part}
      </span>
    );
  });
}

export function DashboardHero({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const params = useSearchParams();
  const summary = data.executiveSummary;
  if (!summary) return null;

  const isFull = item.eligibility.variant === "full";
  const reportHref = `/report${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={HERO_ENTER}
      className="relative overflow-hidden rounded-3xl border p-8 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)] sm:p-10"
      style={{
        background: "linear-gradient(135deg, oklch(0.97 0.04 300) 0%, oklch(0.96 0.05 260) 45%, oklch(0.97 0.04 350) 100%)",
        borderColor: "rgba(139,92,246,0.25)",
      }}
    >
      <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5), transparent 70%)" }} />
      <div className="pointer-events-none absolute right-1/3 top-10 h-40 w-40 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.88 0.12 350 / 0.5), transparent 70%)" }} />

      <div className="relative flex flex-col">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "oklch(0.45 0.18 290)" }}>
            Insikter från proffset
          </p>
          <span className="text-[11px]" style={{ color: "oklch(0.45 0.18 290)" }}>—</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "oklch(0.45 0.18 290)" }}>
            {data.meta.period.label}
          </span>
        </div>

        <p className="mt-5 text-[2rem] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[2.4rem]" style={{ color: "oklch(0.14 0.02 280)" }}>
          <span className="relative inline">
            {colorizeNumbers(summary.headline)}
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
                stroke="oklch(0.62 0.22 295)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </p>

        {isFull && summary.subheadline && (
          <p className="mt-6 text-lg font-normal leading-relaxed" style={{ color: "oklch(0.38 0.06 280)" }}>
            {colorizeNumbers(summary.subheadline)}
          </p>
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
