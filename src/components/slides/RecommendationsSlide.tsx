"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { Rule } from "@/components/primitives/Rule";
import { Recommendation } from "@/types/schema";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

function RecRow({ rec, index }: { rec: Recommendation; index: number }) {
  const { t } = useLocale();
  const effortImpactLabel = t.recommendations.levels;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }}
    >
      <div className="py-6 grid grid-cols-[auto_1fr_auto] gap-6 items-start">
        {/* Priority number */}
        <div className="w-7 h-7 rounded-full border border-[var(--rule)] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[11px] font-medium text-[var(--slate)]">{rec.priority}</span>
        </div>

        {/* Content */}
        <div>
          <div className="mb-1">
            <span className="text-[10px] uppercase tracking-wider text-[var(--slate-light)] mr-2">
              {rec.category}
            </span>
          </div>
          <p className="text-[15px] font-medium text-[var(--charcoal)] mb-2 leading-snug">
            {rec.action}
          </p>
          <p className="text-[13px] text-[var(--slate)] leading-relaxed">{rec.rationale}</p>
        </div>

        {/* Effort / Impact badges */}
        <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider text-[var(--slate-light)]">{t.recommendations.effort}</span>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-sm",
                rec.effort === "low" && "bg-[var(--signal-up-bg)] text-[var(--signal-up)]",
                rec.effort === "medium" && "bg-[#FEF3E5] text-[var(--warning)]",
                rec.effort === "high" && "bg-[var(--signal-down-bg)] text-[var(--signal-down)]"
              )}
            >
              {effortImpactLabel[rec.effort]}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider text-[var(--slate-light)]">{t.recommendations.impact}</span>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-sm",
                rec.impact === "high" && "bg-[var(--signal-up-bg)] text-[var(--signal-up)]",
                rec.impact === "medium" && "bg-[#FEF3E5] text-[var(--warning)]",
                rec.impact === "low" && "bg-[var(--bone-dark)] text-[var(--slate)]"
              )}
            >
              {effortImpactLabel[rec.impact]}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RecommendationsSlide({ data }: ModuleProps) {
  const { t } = useLocale();
  const recs = data.recommendations;
  if (!recs?.length) return null;

  const sorted = [...recs].sort((a, b) => a.priority - b.priority);

  return (
    <div className="slide bg-[var(--bone)]">
      <div className="w-full max-w-3xl">
        <SlideHeader
          eyebrow={t.recommendations.eyebrow}
          headline={t.recommendations.headline}
          subheadline={t.recommendations.subheadline(sorted.length)}
          headlineSize="2xl"
        />

        <div className="space-y-0">
          {sorted.map((rec, i) => (
            <div key={rec.id}>
              <RecRow rec={rec} index={i} />
              {i < sorted.length - 1 && <Rule light />}
            </div>
          ))}
        </div>

        <motion.div
          className="mt-10 pt-8 border-t border-[var(--rule-light)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <p className="text-[12px] text-[var(--slate-light)] leading-relaxed max-w-lg">
            {t.recommendations.disclaimer(data.meta.agencyName)}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
