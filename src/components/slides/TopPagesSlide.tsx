"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { formatNumber } from "@/lib/utils/format";
import { Rule } from "@/components/primitives/Rule";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

const trendSymbol = {
  up: "↑",
  down: "↓",
  flat: "→",
};

export default function TopPagesSlide({ data }: ModuleProps) {
  const { t } = useLocale();
  const pages = data.topPages;
  if (!pages?.pages?.length) return null;

  return (
    <div className="slide bg-[var(--bone)]">
      <div className="w-full">
        <SlideHeader
          eyebrow={t.topPages.eyebrow}
          headline={t.topPages.headline}
          subheadline={t.topPages.subheadline}
          headlineSize="2xl"
        />

        <div className="space-y-0">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 pb-3">
            <span className="eyebrow">{t.topPages.colPage}</span>
            <span className="eyebrow text-right w-24">{t.topPages.colSessions}</span>
            <span className="eyebrow text-right w-20">{t.topPages.colClicks}</span>
            <span className="eyebrow text-right w-20">{t.topPages.colPosition}</span>
            <span className="eyebrow text-right w-12">{t.topPages.colTrend}</span>
          </div>
          <Rule />

          {pages.pages.map((page, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
            >
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 py-4 items-center">
                <div>
                  {page.title && (
                    <p className="text-sm font-medium text-[var(--charcoal)] mb-0.5">
                      {page.title}
                    </p>
                  )}
                  <p className="text-[11px] text-[var(--slate-light)] font-mono">{page.url}</p>
                </div>
                <span className="text-sm text-[var(--charcoal)] text-right tabular-nums w-24">
                  {page.sessions ? formatNumber(page.sessions) : "—"}
                </span>
                <span className="text-sm text-[var(--slate)] text-right tabular-nums w-20">
                  {page.clicks ? formatNumber(page.clicks) : "—"}
                </span>
                <span className="text-sm text-[var(--slate)] text-right tabular-nums w-20">
                  {page.position ? page.position.toFixed(1) : "—"}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium text-right w-12",
                    page.trend === "up" && "text-[var(--signal-up)]",
                    page.trend === "down" && "text-[var(--signal-down)]",
                    page.trend === "flat" && "text-[var(--slate-light)]"
                  )}
                >
                  {page.trend ? trendSymbol[page.trend] : "—"}
                </span>
              </div>
              {i < pages.pages.length - 1 && <Rule light />}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
