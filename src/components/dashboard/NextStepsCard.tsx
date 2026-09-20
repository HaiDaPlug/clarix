"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { deriveNextStepsWithEvidence } from "@/lib/dashboard/next-steps";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import { ShimmerCard } from "@/components/primitives/ShimmerCard";

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

const COPY = {
  sv: { eyebrow: "Prioriterat", title: "Nästa steg", show: "Visa underlag", hide: "Dölj underlag", effort: "Insats", impact: "Effekt", previous: "föreg." },
  en: { eyebrow: "Prioritised", title: "Next steps", show: "Show evidence", hide: "Hide evidence", effort: "Effort", impact: "Impact", previous: "prev." },
} as const;

/**
 * Each suggestion is structured the same way: the action, the reason, and
 * the figures it rests on behind "Visa underlag". The reason may come from
 * the model; the figures never do — they are read straight from the data.
 */
export function NextStepsCard({
  data,
  aiInsights,
  loading,
}: {
  data: ReportData;
  aiInsights: AiInsightsPayload | null;
  loading: boolean;
}) {
  const { locale } = useLocale();
  const prefersReduced = useReducedMotion();
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const items = deriveNextStepsWithEvidence(data);
  if (!items.length) return null;

  const copy = COPY[locale === "sv" ? "sv" : "en"];

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="surface-card p-5 sm:p-6"
      aria-busy={loading}
    >
      <div className="mb-3">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h3
          className="font-display"
          style={{ fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25, color: "var(--text-primary)", marginTop: "6px" }}
        >
          {copy.title}
        </h3>
      </div>

      {/* A divided list, not a stack of cards inside a card: the numbering and
          alignment already say "these belong together". */}
      <ol className="flex flex-col">
        {items.map(({ step, evidence }, i) => {
          const isOpen = Boolean(open[i]);
          const panelId = `next-step-evidence-${i}`;
          return (
            <li
              key={i}
              className="flex items-start gap-3.5 py-3.5"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--line-soft)" }}
            >
              <span
                className="font-stat flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--surface-tint)", color: "var(--text-primary)", fontSize: "12px", fontWeight: 700, marginTop: "1px" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: "15px", fontWeight: 500, lineHeight: 1.35, color: "var(--text-primary)" }}>
                  {step.action}
                </p>
                {loading ? (
                  <ShimmerCard
                    loading
                    height={14}
                    style={{ border: "none", borderRadius: 999, backgroundColor: "var(--surface-tint)", marginTop: "6px", width: "80%" }}
                  />
                ) : (
                  <p style={{ fontSize: "13.5px", lineHeight: 1.5, color: "var(--text-primary)", marginTop: "3px" }}>
                    {highlightNumbers(withPeriod(aiInsights?.next_steps?.[i]?.rationale ?? step.rationale), "light", "signed")}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="flex items-center gap-1.5" aria-label={`${copy.effort}: ${step.effort}. ${copy.impact}: ${step.reward}.`}>
                    <Tag>{copy.effort}: {step.effort}</Tag>
                    <Tag>{copy.impact}: {step.reward}</Tag>
                  </span>
                  {evidence.length > 0 && (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))}
                      className="inline-flex items-center gap-1 rounded-md py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)] focus-visible:ring-offset-2"
                      style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {isOpen ? copy.hide : copy.show}
                      <ChevronDown
                        className="h-3.5 w-3.5 transition-transform"
                        style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </button>
                  )}
                </div>

                {isOpen && evidence.length > 0 && (
                  <dl
                    id={panelId}
                    className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[10px] p-3 sm:grid-cols-3"
                    style={{ background: "var(--surface-tint)" }}
                  >
                    {evidence.map((e) => (
                      <div key={e.label} className="min-w-0">
                        <dt className="truncate" style={{ fontSize: "11.5px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                          {e.label}
                        </dt>
                        <dd style={{ marginTop: "2px" }}>
                          <span className="font-stat tabular-nums" style={{ display: "block", fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                            {e.value}
                          </span>
                          {e.previous && (
                            <span className="tabular-nums" style={{ display: "block", fontSize: "11.5px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                              {copy.previous} {e.previous}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-secondary)", background: "var(--surface-tint)", whiteSpace: "nowrap" }}
    >
      {children}
    </span>
  );
}
