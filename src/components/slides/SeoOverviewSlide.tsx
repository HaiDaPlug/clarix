"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { TrendLine } from "@/components/charts/TrendLine";
import { formatNumber, formatChange } from "@/lib/utils/format";
import { Rule } from "@/components/primitives/Rule";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

export default function SeoOverviewSlide({ data, variant }: ModuleProps) {
  const { t } = useLocale();
  const seo = data.seoOverview;
  if (!seo) return null;

  const coreMetrics = [
    seo.totalClicks,
    seo.totalImpressions,
    seo.avgPosition,
    seo.avgCtr,
  ];

  return (
    <div className="slide bg-[var(--parchment)]">
      <div className="w-full">
        <SlideHeader
          eyebrow={t.seoOverview.eyebrow}
          headline={t.seoOverview.headline}
          headlineSize="2xl"
        />

        {/* 4 key metrics */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-12"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {coreMetrics.map((metric, i) => {
            const change = metric.previousValue !== undefined
              ? formatChange(metric.value, metric.previousValue)
              : null;
            const isGood = change
              ? (change.direction === "up" && metric.trendGood !== false) ||
                (change.direction === "down" && metric.trendGood === false)
              : null;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
                className={cn(
                  "py-5",
                  i > 0 && "md:pl-8 md:border-l md:border-[var(--rule-light)]",
                  i % 2 === 1 && "pl-6 border-l border-[var(--rule-light)] md:border-0"
                )}
              >
                <p className="eyebrow mb-2">{metric.label}</p>
                <p className="font-display text-[clamp(1.8rem,3.5vw,3rem)] leading-none tracking-tight text-[var(--charcoal)]">
                  {formatNumber(metric.value, metric.unit)}
                </p>
                {change && change.direction !== "flat" && (
                  <p
                    className={cn(
                      "text-[11px] font-medium mt-1.5",
                      isGood === true && "text-[var(--signal-up)]",
                      isGood === false && "text-[var(--signal-down)]",
                      isGood === null && "text-[var(--slate)]"
                    )}
                  >
                    {change.sign}{change.value}
                  </p>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <Rule light className="mb-10" />

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="eyebrow mb-5">{t.seoOverview.clicksOverTime}</p>
          <TrendLine
            data={seo.timeSeries}
            height={160}
            showAxes
            showGrid
            color="var(--charcoal)"
          />
        </motion.div>

        {/* Top queries — only in full variant */}
        {variant !== "simplified" && seo.topQueries && seo.topQueries.length > 0 && (
          <motion.div
            className="mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <p className="eyebrow mb-5">{t.seoOverview.topQueries}</p>
            <div className="space-y-0">
              {seo.topQueries.slice(0, 5).map((q, i) => (
                <div key={i}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-6 py-3 text-sm items-center">
                    <span className="text-[var(--charcoal)] font-medium truncate">{q.query}</span>
                    <span className="text-[var(--slate)] text-right tabular-nums">
                      {t.seoOverview.clicks(q.clicks)}
                    </span>
                    <span className="text-[var(--slate-light)] text-right tabular-nums text-[12px]">
                      {t.seoOverview.pos(q.position.toFixed(1))}
                    </span>
                    <span className="text-[var(--slate-light)] text-right tabular-nums text-[12px]">
                      {t.seoOverview.ctr(q.ctr.toFixed(1))}
                    </span>
                  </div>
                  {i < seo.topQueries!.length - 1 && <Rule light />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
