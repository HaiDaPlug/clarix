"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { TrendLine } from "@/components/charts/TrendLine";
import { formatNumber, formatChange } from "@/lib/utils/format";
import { Rule } from "@/components/primitives/Rule";
import { Metric } from "@/types/schema";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

function PaidMetric({ metric, highlight = false, index = 0 }: { metric: Metric; highlight?: boolean; index?: number }) {
  const change = metric.previousValue !== undefined
    ? formatChange(metric.value, metric.previousValue)
    : null;
  const isGood = change
    ? (change.direction === "up" && metric.trendGood !== false) ||
      (change.direction === "down" && metric.trendGood === false)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.07 }}
      className={cn("py-4", highlight && "py-5")}
    >
      <p className="eyebrow mb-2">{metric.label}</p>
      <p
        className={cn(
          "font-display leading-none tracking-tight text-[var(--charcoal)]",
          highlight ? "text-[clamp(2.5rem,4vw,4rem)]" : "text-2xl"
        )}
      >
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
}

export default function PaidOverviewSlide({ data, variant }: ModuleProps) {
  const { t } = useLocale();
  const paid = data.paidOverview;
  if (!paid) return null;

  const secondaryMetrics = [
    paid.totalClicks,
    paid.avgCpc,
    paid.avgCtr,
    paid.costPerConversion,
    paid.roas,
  ].filter(Boolean) as Metric[];

  return (
    <div className="slide bg-[var(--parchment)]">
      <div className="w-full">
        <SlideHeader
          eyebrow={t.paidOverview.eyebrow}
          headline={t.paidOverview.headline}
          headlineSize="2xl"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Spend + chart */}
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <PaidMetric metric={paid.totalSpend} highlight index={0} />
            {paid.conversions && (
              <div className="flex gap-8 mt-2 mb-6">
                <div>
                  <p className="eyebrow mb-1">{t.paidOverview.conversions}</p>
                  <p className="font-display text-2xl text-[var(--charcoal)]">
                    {formatNumber(paid.conversions.value)}
                  </p>
                </div>
                {paid.roas && (
                  <div>
                    <p className="eyebrow mb-1">{t.paidOverview.roas}</p>
                    <p className="font-display text-2xl text-[var(--charcoal)]">
                      {paid.roas.value.toFixed(1)}×
                    </p>
                  </div>
                )}
              </div>
            )}
            <TrendLine
              data={paid.timeSeries}
              height={160}
              showAxes
              showGrid
              color="var(--charcoal)"
              unit="currency"
            />
          </motion.div>

          {/* Secondary metrics */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-0">{t.paidOverview.efficiency}</p>
            {secondaryMetrics.map((m, i) => (
              <div key={i}>
                <PaidMetric metric={m} index={i + 1} />
                {i < secondaryMetrics.length - 1 && <Rule light />}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
