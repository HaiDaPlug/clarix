"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AiInsightsPayload } from "@/lib/ai-insights/types";
import { buildEvidenceRegistry, type Evidence } from "@/lib/ai-insights/evidence";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { withPeriod } from "@/lib/utils/text";
import type { ReportData } from "@/types/schema";
import { AI_SHIMMER, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, TREND_POS } from "./tokens";

// Same tone language as the desktop slide (SlideHero).
const TONE_DOT = { grow: TREND_POS, watch: "#FF6B55" } as const;
const TONE_BORDER = { grow: "oklch(0.7 0.16 155 / 0.28)", watch: "oklch(0.7 0.19 35 / 0.28)" } as const;
const DIVIDER = "oklch(0.7 0.09 295 / 0.55)";

/**
 * The model's next steps for the phone report. There is no hover on touch,
 * so the desktop tooltip becomes a tap-to-expand row carrying the same why
 * and the same data-backed figures. No AI steps, no section.
 */
export function MobileNextSteps({
  reportData,
  aiInsights,
  aiLoading,
  moreHref,
}: {
  reportData: ReportData;
  aiInsights: AiInsightsPayload | null;
  aiLoading: boolean;
  /** Lead mode: show only the first step ("Börja här") and link here for the
   *  rest. The phone summary uses it so the steps aren't listed twice in one
   *  scroll; the full list lives in the Nästa steg section. */
  moreHref?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const registry = useMemo(() => buildEvidenceRegistry(reportData), [reportData]);
  const steps = aiInsights?.slide_next_steps ?? null;

  if (!aiLoading && !steps) return null;

  return (
    <div className="mt-5">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: AI_TEXT_PRIMARY, opacity: 0.6 }}>
        {moreHref ? "Börja här" : "Nästa steg"}
      </p>
      {aiLoading || !steps ? (
        <div className="space-y-2" aria-label="Nästa steg laddas">
          <div className="h-12 animate-pulse rounded-2xl" style={{ background: AI_SHIMMER }} />
          <div className="h-12 animate-pulse rounded-2xl" style={{ background: AI_SHIMMER }} />
        </div>
      ) : (
        <ul className="space-y-2">
          {(moreHref ? steps.slice(0, 1) : steps).map((step, i) => {
            const isOpen = open === i;
            const panelId = `mobile-next-step-${i}`;
            const evidence = step.evidence.map((key) => registry[key]).filter((e): e is Evidence => !!e);
            return (
              <li
                key={`${i}-${step.action}`}
                className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_-12px_rgba(139,92,246,0.25)]"
                style={{ border: `1px solid ${TONE_BORDER[step.tone]}` }}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TONE_DOT[step.tone] }} />
                  <span className="flex-1 text-[15px] font-semibold leading-snug" style={{ color: AI_TEXT_PRIMARY }}>
                    {step.action}
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform"
                    style={{ color: AI_TEXT_SECONDARY, transform: isOpen ? "rotate(180deg)" : undefined }}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div id={panelId} className="px-4 pb-4">
                    <p className="border-t pt-3 text-[14.5px] leading-relaxed" style={{ color: AI_TEXT_PRIMARY, borderColor: DIVIDER }}>
                      {highlightNumbers(withPeriod(step.why), "light", "signed")}
                    </p>
                    {evidence.length > 0 && (
                      <dl className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: DIVIDER }}>
                        {evidence.map((e) => (
                          <div key={e.label} className="flex items-baseline justify-between gap-3">
                            <dt className="text-[13px] font-medium" style={{ color: AI_TEXT_SECONDARY }}>
                              {e.label}:
                            </dt>
                            <dd className="shrink-0 text-right tabular-nums">
                              <span className="font-stat text-[15px] font-semibold" style={{ color: AI_TEXT_PRIMARY }}>
                                {e.value}
                              </span>
                              {e.previous && (
                                <span className="block text-[12px]" style={{ color: AI_TEXT_PRIMARY, opacity: 0.55 }}>
                                  föregående {e.previous}
                                </span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {moreHref && steps && steps.length > 1 && (
        <a href={moreHref} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: AI_TEXT_SECONDARY }}>
          Alla {steps.length} steg
          <ChevronDown className="h-4 w-4" aria-hidden />
        </a>
      )}
    </div>
  );
}
