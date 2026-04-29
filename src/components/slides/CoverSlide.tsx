"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { formatDate } from "@/lib/utils/format";
import { Rule } from "@/components/primitives/Rule";
import { useLocale } from "@/lib/i18n";

export default function CoverSlide({ data }: ModuleProps) {
  const { t } = useLocale();
  const { meta } = data;

  return (
    <div className="slide bg-[var(--parchment)] relative">
      {/* Decorative arc — large, quiet, bottom-right */}
      <div
        className="absolute bottom-0 right-0 w-[65vw] h-[65vw] max-w-[700px] max-h-[700px] rounded-full border border-[var(--rule)] opacity-40 translate-x-1/3 translate-y-1/3 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-0 w-[40vw] h-[40vw] max-w-[440px] max-h-[440px] rounded-full border border-[var(--rule)] opacity-25 translate-x-1/4 translate-y-1/4 pointer-events-none"
        aria-hidden
      />


      {/* Main content */}
      <div className="max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow mb-6">{t.cover.eyebrow}</p>
          <h1 className="font-display text-[clamp(3rem,7vw,6rem)] leading-[1.04] tracking-[-0.025em] text-[var(--charcoal)] mb-4">
            {meta.clientName}
          </h1>
          <p className="text-[var(--slate)] text-lg leading-relaxed max-w-lg">
            {t.cover.intro(meta.agencyName)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Rule className="mt-10 mb-6 max-w-sm" />
          <div className="flex items-center gap-6 text-sm text-[var(--slate)]">
            {meta.clientDomain && (
              <span className="font-medium text-[var(--charcoal)]">{meta.clientDomain}</span>
            )}
            <span>{meta.period.label}</span>
          </div>
        </motion.div>
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-8 left-10 right-10 flex items-center justify-between">
        <p className="label-xs uppercase tracking-widest">
          {t.cover.cadenceReport(meta.cadence)}
        </p>
        <p className="label-xs">
          {t.cover.generated(formatDate(meta.generatedAt))}
        </p>
      </div>
    </div>
  );
}
