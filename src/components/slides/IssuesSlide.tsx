"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { Rule } from "@/components/primitives/Rule";
import { Issue } from "@/types/schema";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

function IssueRow({ issue, index }: { issue: Issue; index: number }) {
  const { t } = useLocale();
  const severityConfig = {
    critical: { label: t.issues.severity.critical, dot: "bg-[var(--critical)]", text: "text-[var(--critical)]", bg: "bg-[#F9EAEC]" },
    warning: { label: t.issues.severity.warning, dot: "bg-[var(--warning)]", text: "text-[var(--warning)]", bg: "bg-[#FEF3E5]" },
    info: { label: t.issues.severity.info, dot: "bg-[var(--info-color)]", text: "text-[var(--info-color)]", bg: "bg-[#EBF0F9]" },
  };
  const cfg = severityConfig[issue.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.07 }}
    >
      <div className="py-5 grid grid-cols-[auto_1fr_auto] gap-4 items-start">
        {/* Severity dot */}
        <div className="mt-1.5">
          <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-medium uppercase tracking-wider", cfg.text)}>
              {issue.category}
            </span>
          </div>
          <p className="text-sm font-medium text-[var(--charcoal)] mb-1">{issue.title}</p>
          <p className="text-[13px] text-[var(--slate)] leading-relaxed">{issue.description}</p>
          {issue.pagesAffected !== undefined && (
            <p className="text-[11px] text-[var(--slate-light)] mt-1">
              {t.issues.pagesAffected(issue.pagesAffected)}
            </p>
          )}
        </div>

        {/* Impact badge */}
        <div>
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-sm",
              issue.impact === "high" && "bg-[#F9EAEC] text-[var(--critical)]",
              issue.impact === "medium" && "bg-[#FEF3E5] text-[var(--warning)]",
              issue.impact === "low" && "bg-[var(--bone-dark)] text-[var(--slate)]"
            )}
          >
            {issue.impact}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function IssuesSlide({ data }: ModuleProps) {
  const { t } = useLocale();
  const issues = data.issues;
  if (!issues?.length) return null;

  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  const sorted = [...critical, ...warnings, ...infos];

  return (
    <div className="slide bg-[var(--parchment)]">
      <div className="w-full max-w-3xl">
        <SlideHeader
          eyebrow={t.issues.eyebrow}
          headline={
            critical.length > 0
              ? t.issues.headlineCritical(critical.length)
              : t.issues.headlineItems(issues.length)
          }
          subheadline={t.issues.subheadline}
          headlineSize="2xl"
        />

        <div className="space-y-0">
          {sorted.map((issue, i) => (
            <div key={issue.id}>
              <IssueRow issue={issue} index={i} />
              {i < sorted.length - 1 && <Rule light />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
