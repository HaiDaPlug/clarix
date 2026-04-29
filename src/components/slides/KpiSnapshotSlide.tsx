"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { formatNumber, formatChange } from "@/lib/utils/format";
import { Metric } from "@/types/schema";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

function KpiCard({ metric, index }: { metric: Metric; index: number }) {
  const { t } = useLocale();
  const change =
    metric.previousValue !== undefined
      ? formatChange(metric.value, metric.previousValue)
      : null;

  const isGood = change
    ? (change.direction === "up" && metric.trendGood !== false) ||
      (change.direction === "down" && metric.trendGood === false)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.08 + index * 0.07,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-col py-6 px-0 first:pl-0"
    >
      <p className="eyebrow mb-3">{metric.label}</p>
      <p className="font-display text-[clamp(2rem,3.5vw,3.25rem)] leading-none tracking-tight text-[var(--charcoal)]">
        {formatNumber(metric.value, metric.unit)}
      </p>
      {change && change.direction !== "flat" && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-sm",
              isGood === true && "bg-[var(--signal-up-bg)] text-[var(--signal-up)]",
              isGood === false && "bg-[var(--signal-down-bg)] text-[var(--signal-down)]",
              isGood === null && "bg-[var(--bone-dark)] text-[var(--slate)]"
            )}
          >
            {change.sign}
            {change.value}
          </span>
          <span className="text-[10px] text-[var(--slate-light)]">{t.kpiSnapshot.vsPrior}</span>
        </div>
      )}
    </motion.div>
  );
}

export default function KpiSnapshotSlide({ data }: ModuleProps) {
  const { t } = useLocale();
  const snapshot = data.kpiSnapshot;
  if (!snapshot) return null;

  const cols3 = snapshot.metrics.length >= 3;

  return (
    <div className="slide bg-[var(--parchment)]">
      <div className="w-full">
        <SlideHeader
          eyebrow={t.kpiSnapshot.eyebrow}
          headline={t.kpiSnapshot.headline}
          subheadline={
            snapshot.comparisonPeriod
              ? `${snapshot.period} vs ${snapshot.comparisonPeriod}`
              : snapshot.period
          }
          headlineSize="2xl"
        />

        <div
          className={cn(
            "grid gap-0 divide-x divide-[var(--rule-light)]",
            cols3 ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          {snapshot.metrics.slice(0, cols3 ? 6 : 4).map((metric, i) => (
            <div
              key={i}
              className={cn(
                "pl-6 first:pl-0",
                i >= (cols3 ? 3 : 2) && "pt-6 mt-6 border-t border-[var(--rule-light)]"
              )}
            >
              <KpiCard metric={metric} index={i} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
