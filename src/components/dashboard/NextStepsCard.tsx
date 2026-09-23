"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { buildEvidenceRegistry, type Evidence } from "@/lib/ai-insights/evidence";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import { ShimmerCard } from "@/components/primitives/ShimmerCard";

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

const COPY = {
  sv: { eyebrow: "Prioriterat", title: "Nästa steg", show: "Visa underlag", hide: "Dölj underlag", previous: "föregående" },
  en: { eyebrow: "Prioritised", title: "Next steps", show: "Show evidence", hide: "Hide evidence", previous: "previous" },
} as const;

// "grow" builds on what works, "watch" fixes something that slipped — the
// same split as the report's chips, in the dashboard's own tokens.
const TONE = {
  grow: { bg: "var(--signal-up-bg)", fg: "var(--signal-up)" },
  watch: { bg: "color-mix(in oklch, var(--brand-coral) 14%, transparent)", fg: "var(--brand-coral)" },
} as const;

/**
 * The model's next steps — the same ones the report's summary slide shows.
 * Each is the action, the reason, and the figures it rests on behind
 * "Visa underlag". The model writes the action and reason and names the
 * figures; their values are read straight from the data. No AI steps, no card.
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
  const registry = useMemo(() => buildEvidenceRegistry(data), [data]);
  const steps = aiInsights?.slide_next_steps ?? null;
  if (!loading && !steps) return null;

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

      {loading || !steps ? (
        <div className="flex flex-col gap-4 py-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <ShimmerCard loading height={16} style={{ border: "none", borderRadius: 999, backgroundColor: "var(--surface-tint)", width: "55%" }} />
              <ShimmerCard loading height={13} style={{ border: "none", borderRadius: 999, backgroundColor: "var(--surface-tint)", width: "85%" }} />
            </div>
          ))}
        </div>
      ) : (
        /* A divided list, not a stack of cards inside a card: the numbering
           and alignment already say "these belong together". */
        <ol className="flex flex-col">
          {steps.map((step, i) => {
            const isOpen = Boolean(open[i]);
            const panelId = `next-step-evidence-${i}`;
            const evidence = step.evidence.map((key) => registry[key]).filter((e): e is Evidence => !!e);
            return (
              <li
                key={`${i}-${step.action}`}
                className="flex items-start gap-3.5 py-3.5"
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--line-soft)" }}
              >
                <span
                  className="font-stat flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: TONE[step.tone].bg, color: TONE[step.tone].fg, fontSize: "12px", fontWeight: 700, marginTop: "1px" }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: "15px", fontWeight: 500, lineHeight: 1.35, color: "var(--text-primary)" }}>
                    {step.action}
                  </p>
                  <p style={{ fontSize: "13.5px", lineHeight: 1.5, color: "var(--text-primary)", marginTop: "3px" }}>
                    {highlightNumbers(withPeriod(step.why), "light", "signed")}
                  </p>

                  {evidence.length > 0 && (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))}
                      className="mt-2 inline-flex items-center gap-1 rounded-md py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)] focus-visible:ring-offset-2"
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

                  {isOpen && evidence.length > 0 && (
                    <dl
                      id={panelId}
                      className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[10px] p-3 sm:grid-cols-3"
                      style={{ background: "var(--surface-tint)" }}
                    >
                      {evidence.map((e) => (
                        <div key={e.label} className="min-w-0">
                          {/* Wraps rather than truncates: labels are written out in full. */}
                          <dt className="break-words" style={{ fontSize: "11.5px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
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
      )}
    </motion.section>
  );
}
