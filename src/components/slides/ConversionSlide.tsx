"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { formatNumber, formatChange } from "@/lib/utils/format";
import { Rule } from "@/components/primitives/Rule";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

export default function ConversionSlide({ data }: ModuleProps) {
  const { t } = useLocale();
  const conv = data.conversions;
  if (!conv) return null;

  const rateChange = conv.conversionRate.previousValue !== undefined
    ? formatChange(conv.conversionRate.value, conv.conversionRate.previousValue)
    : null;

  return (
    <div className="slide bg-[var(--bone)]">
      <div className="w-full max-w-3xl">
        <SlideHeader
          eyebrow={t.conversion.eyebrow}
          headline={t.conversion.headline}
          headlineSize="2xl"
        />

        <div className="grid grid-cols-2 gap-12 mb-10">
          {/* Total conversions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="eyebrow mb-3">{conv.totalConversions.label}</p>
            <p className="font-display text-[clamp(3rem,5vw,5rem)] leading-none tracking-tight text-[var(--charcoal)]">
              {formatNumber(conv.totalConversions.value)}
            </p>
            {conv.totalConversions.previousValue && (
              <p className="text-sm text-[var(--slate)] mt-2">
                {(() => {
                  const c = formatChange(
                    conv.totalConversions.value,
                    conv.totalConversions.previousValue!
                  );
                  return (
                    <span className={cn(c.direction === "up" ? "text-[var(--signal-up)]" : "text-[var(--signal-down)]")}>
                      {c.sign}{c.value}
                    </span>
                  );
                })()}
                {" "}{t.conversion.vsPrior}
              </p>
            )}
          </motion.div>

          {/* Conversion rate */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
          >
            <p className="eyebrow mb-3">{conv.conversionRate.label}</p>
            <p className="font-display text-[clamp(3rem,5vw,5rem)] leading-none tracking-tight text-[var(--charcoal)]">
              {conv.conversionRate.value.toFixed(1)}%
            </p>
            {rateChange && rateChange.direction !== "flat" && (
              <p
                className={cn(
                  "text-sm mt-2",
                  rateChange.direction === "up"
                    ? "text-[var(--signal-up)]"
                    : "text-[var(--signal-down)]"
                )}
              >
                {rateChange.sign}{rateChange.value} {t.conversion.vsPrior}
              </p>
            )}
          </motion.div>
        </div>

        {/* Goal breakdown */}
        {conv.topGoals && conv.topGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Rule className="mb-8" />
            <p className="eyebrow mb-5">{t.conversion.goalCompletions}</p>
            <div className="space-y-0">
              {conv.topGoals.map((goal, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-[var(--charcoal)]">{goal.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-[var(--charcoal)] tabular-nums">
                        {formatNumber(goal.completions)}
                      </span>
                      {goal.rate !== undefined && (
                        <span className="text-[11px] text-[var(--slate-light)] w-14 text-right tabular-nums">
                          {goal.rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {i < conv.topGoals!.length - 1 && <Rule light />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
