"use client";

import { motion, useReducedMotion } from "motion/react";
import { AssembledDashboardItem } from "@/types/dashboard";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { MetricTile } from "@/components/dashboard/metrics";

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

export function SearchVisibility({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const prefersReduced = useReducedMotion();
  const seo = data.seoOverview;
  if (!seo) return null;

  const isFull = item.eligibility.variant === "full";

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="surface-card p-5 sm:p-6"
    >
      <p className="eyebrow">{t.dashboard.search.eyebrow}</p>
      {isFull && (
        <h3
          className="font-display"
          style={{ fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25, color: "var(--text-primary)", marginTop: "6px" }}
        >
          {t.registry.searchVisibility.narrative}
        </h3>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5" style={{ marginTop: "20px" }}>
        {[seo.totalClicks, seo.totalImpressions, seo.avgCtr, seo.avgPosition].map((metric) => (
          <MetricTile key={metric.label} metric={metric} />
        ))}
      </div>
    </motion.section>
  );
}
