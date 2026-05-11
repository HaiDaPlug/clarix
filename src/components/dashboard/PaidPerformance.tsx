"use client";

import { motion } from "motion/react";
import { AssembledDashboardItem } from "@/types/dashboard";
import { Metric, ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { MetricTile } from "@/components/dashboard/metrics";

const EASE_OUT = [0.0, 0.0, 0.2, 1] as const;

export function PaidPerformance({ item, data }: { item: AssembledDashboardItem; data: ReportData }) {
  const { t } = useLocale();
  const paid = data.paidOverview;
  if (!paid) return null;

  const isFull = item.eligibility.variant === "full";
  const metrics = isFull
    ? [paid.totalSpend, paid.totalClicks, paid.avgCpc, paid.roas, paid.conversions].filter((m): m is Metric => Boolean(m))
    : [paid.totalSpend, paid.totalClicks];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
    >
      <p className="eyebrow mb-1" style={{ color: "var(--slate)" }}>{t.dashboard.paid.eyebrow}</p>
      {isFull && (
        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--charcoal)", marginBottom: "20px", letterSpacing: "-0.025em" }}>
          {t.registry.paidPerformance.narrative}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-6" style={{ marginTop: isFull ? 0 : "16px" }}>
        {metrics.map((metric) => (
          <MetricTile key={metric.label} metric={metric} />
        ))}
      </div>
    </motion.div>
  );
}
