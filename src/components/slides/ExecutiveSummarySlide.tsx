"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { Rule } from "@/components/primitives/Rule";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

export default function ExecutiveSummarySlide({ data }: ModuleProps) {
  const { t } = useLocale();
  const summary = data.executiveSummary;
  if (!summary) return null;

  return (
    <div className="slide bg-[var(--bone)]">
      <div className="max-w-4xl w-full">
        <SlideHeader
          eyebrow={t.executiveSummary.eyebrow}
          headline={summary.headline}
          subheadline={summary.subheadline}
          headlineSize="2xl"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-2">
          {/* Narrative text */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {summary.paragraphs.map((p, i) => (
              <p key={i} className="text-[var(--charcoal-mid)] leading-relaxed text-[15px]">
                {p}
              </p>
            ))}

            {/* AI summary stub */}
            {summary.aiSummary && (
              <div className="mt-6 pt-6 border-t border-[var(--rule-light)]">
                <p className="eyebrow mb-4">{t.executiveSummary.aiEyebrow}</p>
                <div className="space-y-3">
                  {summary.aiSummary.whatHappened && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--slate-light)] mb-1">
                        {t.executiveSummary.whatHappened}
                      </p>
                      <p className="text-sm text-[var(--slate)] leading-relaxed">
                        {summary.aiSummary.whatHappened}
                      </p>
                    </div>
                  )}
                  {summary.aiSummary.whyItMatters && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--slate-light)] mb-1">
                        {t.executiveSummary.whyItMatters}
                      </p>
                      <p className="text-sm text-[var(--slate)] leading-relaxed">
                        {summary.aiSummary.whyItMatters}
                      </p>
                    </div>
                  )}
                  {summary.aiSummary.nextStep && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--slate-light)] mb-1">
                        {t.executiveSummary.nextStep}
                      </p>
                      <p className="text-sm text-[var(--charcoal)] font-medium leading-relaxed">
                        {summary.aiSummary.nextStep}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-5">{t.executiveSummary.keySignals}</p>
            <div className="space-y-0">
              {summary.highlights.map((h, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-[var(--slate)] text-sm">{h.label}</span>
                    <span
                      className={cn(
                        "text-base font-medium font-display",
                        h.sentiment === "positive" && "text-[var(--signal-up)]",
                        h.sentiment === "negative" && "text-[var(--signal-down)]",
                        h.sentiment === "neutral" && "text-[var(--charcoal)]"
                      )}
                    >
                      {h.value}
                    </span>
                  </div>
                  {i < summary.highlights.length - 1 && <Rule light />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
