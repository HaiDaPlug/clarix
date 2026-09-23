"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Info } from "lucide-react";
import { type AiInsightsPayload, type AiNextStep } from "@/lib/ai-insights/types";
import type { ReportData } from "@/types/schema";
import { buildEvidenceRegistry, type Evidence } from "@/lib/ai-insights/evidence";
import { type SlideData } from "../slide-data";
import { AI_GRADIENT, AI_SHADOW, AI_BORDER, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_SHIMMER, TREND_POS } from "../tokens";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { NoiseTile } from "@/components/ui/noise-tile";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

// "grow" reads as the positive green the deck already uses for deltas;
// "watch" is brand coral, not trend red — these are things to look at, not
// losses, and red would make the summary read as an alarm.
const TONE_DOT = { grow: TREND_POS, watch: "#FF6B55" } as const;
const TONE_BORDER = { grow: "oklch(0.7 0.16 155 / 0.28)", watch: "oklch(0.7 0.19 35 / 0.28)" } as const;

// The prompt caps the summary's length, but the model can still overshoot.
// The card steps the summary down through these sizes until it fits the
// slide, so a long answer shrinks instead of being cut off by the frame.
const SUMMARY_SIZES = ["1.4rem", "1.3rem", "1.2rem", "1.1rem", "1rem"];

/** Keeps the headline's closing mark but always renders it in coral. */
function splitTerminal(text: string): { body: string; mark: string } {
  const trimmed = text.trim();
  const m = trimmed.match(/([.!?…])$/);
  return m ? { body: trimmed.slice(0, -1), mark: m[1] } : { body: trimmed, mark: "." };
}

export function SlideHero({
  d,
  headline,
  aiInsights,
  reportData,
}: {
  d: SlideData;
  headline: string;
  aiInsights: AiInsightsPayload | null;
  reportData: ReportData | null;
}) {
  const { ref, active, reduced } = useSlideReveal();
  const hasData = d.trafficDelta !== null;
  const aiHero = aiInsights?.slide_hero;
  const loading = aiInsights === null;
  const aiSteps = aiInsights?.slide_next_steps ?? null;
  const registry = useMemo(() => (reportData ? buildEvidenceRegistry(reportData) : {}), [reportData]);
  // The same AI verdict the dashboard leads with. The lookup-table headline
  // is only a fallback for when generation failed.
  const title = splitTerminal(aiInsights?.dashboard_hero?.headline ?? headline);

  // Fit: measure the card against its cell and step the summary size down
  // until it fits. Resets whenever the content changes.
  const cellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fitKey = `${aiHero ?? ""}|${aiSteps?.map((s) => s.action).join("|") ?? ""}`;
  const [fit, setFit] = useState({ key: "", step: 0 });
  const sizeStep = fit.key === fitKey ? fit.step : 0;
  useLayoutEffect(() => {
    const cell = cellRef.current;
    const card = cardRef.current;
    if (!cell || !card || loading) return;
    if (card.offsetHeight > cell.clientHeight && sizeStep < SUMMARY_SIZES.length - 1) {
      setFit({ key: fitKey, step: sizeStep + 1 });
    }
  }, [fitKey, sizeStep, loading]);

  return (
    <div
      ref={ref}
      className="relative flex h-full flex-1 overflow-hidden rounded-[2rem] px-16 py-12"
      style={{ background: AI_GRADIENT, boxShadow: AI_SHADOW.replace(/_/g, " "), border: `1px solid ${AI_BORDER}` }}
    >
      <div className="pointer-events-none absolute -top-52 -left-40 h-[30rem] w-[30rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55) 0%, oklch(0.85 0.16 300 / 0.28) 34%, transparent 72%)" }} />
      <div className="pointer-events-none absolute -bottom-56 -right-34 h-[36rem] w-[36rem] rounded-full opacity-60" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5) 0%, oklch(0.86 0.14 220 / 0.25) 34%, transparent 72%)" }} />
      <NoiseTile blendMode="soft-light" opacity={0.45} />

      {/* grid-rows-1 = minmax(0, 1fr): the row is exactly the panel's height
          and never grows with content, so the fit check can measure against it. */}
      <div className="relative z-10 grid h-full w-full grid-cols-12 grid-rows-1 items-center gap-10">
        {/* Left: section eyebrow, headline, one-line promise */}
        <motion.div className="col-span-5 flex flex-col" {...fadeUp(active, reduced)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: AI_TEXT_PRIMARY }}>
            Sammanfattning · {d.period}
          </p>
          {loading ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="h-12 w-[95%] rounded-full" style={{ background: AI_SHIMMER }} />
              <div className="h-12 w-[85%] rounded-full" style={{ background: AI_SHIMMER }} />
              <div className="h-12 w-[55%] rounded-full" style={{ background: AI_SHIMMER }} />
            </div>
          ) : (
            <h2 className="mt-4 font-display text-[3rem] font-bold leading-[1.05] tracking-tight" style={{ color: AI_TEXT_PRIMARY, textWrap: "balance" }}>
              {title.body}<span style={{ color: "#FF6B55" }}>{title.mark}</span>
            </h2>
          )}
          <p className="mt-5 text-[15px]" style={{ color: AI_TEXT_PRIMARY, opacity: 0.7 }}>
            {hasData ? "Jämfört med föregående period." : "Denna period."}
          </p>
        </motion.div>

        {/* Right: white glass card — the period story, then what to do about it */}
        <motion.div ref={cellRef} className="col-span-7 flex h-full items-center" {...fadeUp(active, reduced, { delay: 0.15 })}>
          {/* 0.7 + backdrop-blur-sm → 0.85 flat: the blur only smoothed the
              static gradient + noise grain behind the card; higher opacity
              halves the grain transmission for the same glass read, minus the
              per-scroll backdrop-filter cost. */}
          <div
            ref={cardRef}
            className="w-full rounded-2xl p-7 shadow-[0_20px_50px_-20px_rgba(139,92,246,0.15)]"
            style={{ background: "oklch(1 0 0 / 0.85)", border: "1px solid oklch(0.78 0.06 295 / 0.4)" }}
          >
            {/* Conclusion (left) → why (here) → what to do (below). */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: AI_TEXT_SECONDARY }}>
              Därför
            </p>
            {loading ? (
              <div className="mt-5 flex flex-col gap-4">
                <div className="h-7 w-[92%] rounded-full" style={{ background: AI_SHIMMER }} />
                <div className="h-7 w-[88%] rounded-full" style={{ background: AI_SHIMMER }} />
                <div className="h-7 w-[45%] rounded-full" style={{ background: AI_SHIMMER }} />
              </div>
            ) : (
              /* Starts at 1.4rem: the card also carries the next-step chips
                 and has ~450px of height inside the frame. */
              <p className="mt-4 font-normal leading-[1.45] tracking-normal" style={{ color: AI_TEXT_PRIMARY, fontSize: SUMMARY_SIZES[sizeStep] }}>
                {/* "signed": only the changes carry colour; plain counts are
                    set semibold, so the decisive figure is the one that pops. */}
                {aiHero ? highlightNumbers(withPeriod(aiHero), "light", "signed") : null}
              </p>
            )}
            {/* No AI steps, no section: rule-based stand-ins read as fake. */}
            {loading ? <NextStepsShimmer /> : aiSteps && <NextStepChips steps={aiSteps} registry={registry} />}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function NextStepsLabel() {
  return (
    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: AI_TEXT_PRIMARY, opacity: 0.6 }}>
      Nästa steg
    </p>
  );
}

function NextStepsShimmer() {
  return (
    <div className="mt-6">
      <NextStepsLabel />
      <div className="grid grid-cols-2 gap-1.5">
        <div className="h-10 rounded-xl" style={{ background: AI_SHIMMER }} />
        <div className="h-10 rounded-xl" style={{ background: AI_SHIMMER }} />
      </div>
    </div>
  );
}


/**
 * The model's next steps as chips. How many (1–4) is the model's call.
 * Hover previews why; click pins it (the only way on touch). The popover is
 * positioned inside the slide rather than portalled, so it scales with the
 * canvas like everything else on it.
 */
function NextStepChips({
  steps,
  registry,
}: {
  steps: AiNextStep[];
  registry: Record<string, Evidence>;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open === null) return;
    const close = () => { setOpen(null); setPinned(null); };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const leave = (i: number) => setOpen((cur) => (pinned !== null ? cur : cur === i ? null : cur));

  return (
    <div ref={wrapRef} className="mt-6">
      <NextStepsLabel />
      {/* The first step leads: its own framed row, larger, with the figures it
          rests on visible (a printed or shared report has no hover). The rest
          follow as quiet lines, their reasons one tap away. */}
      <div className="grid grid-cols-1">
        {steps.map((step, i) => {
          const isOpen = open === i;
          const evidence = step.evidence.map((key) => registry[key]).filter((e): e is Evidence => !!e);
          return (
            <div key={`${i}-${step.action}`} className="relative">
              <div
                className={
                  i === 0
                    ? "mb-2 flex h-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_-12px_rgba(139,92,246,0.25)]"
                    : "flex h-full items-center justify-between gap-3 border-t px-4 py-2"
                }
                style={i === 0 ? { border: `1px solid ${TONE_BORDER[step.tone]}` } : { borderColor: "oklch(0.78 0.06 295 / 0.35)" }}
              >
                <span className="flex min-w-0 items-start gap-2.5" style={{ color: AI_TEXT_PRIMARY }}>
                  <span className={`${i === 0 ? "mt-[22px]" : "mt-[7px]"} h-2 w-2 shrink-0 rounded-full`} style={{ background: TONE_DOT[step.tone] }} />
                  <span className="min-w-0">
                    {i === 0 && (
                      <span className="block text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: AI_TEXT_SECONDARY }}>
                        Börja här
                      </span>
                    )}
                    <span className={i === 0 ? "mt-0.5 block text-[17px] font-bold leading-snug" : "block truncate text-[14px] font-medium leading-snug"}>
                      {step.action}
                    </span>
                    {i === 0 && evidence.length > 0 && (
                      <span className="mt-0.5 block truncate text-[12.5px] tabular-nums" style={{ color: AI_TEXT_SECONDARY }}>
                        {evidence.slice(0, 2).map((e) => `${e.label} ${e.value}`).join("  ·  ")}
                      </span>
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Varför: ${step.action}`}
                  aria-expanded={isOpen}
                  onMouseEnter={() => setOpen(i)}
                  onMouseLeave={() => leave(i)}
                  onClick={() => {
                    const same = pinned === i;
                    setPinned(same ? null : i);
                    setOpen(same ? null : i);
                  }}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[oklch(0.62_0.22_295/0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.62_0.22_295/0.5)]"
                  style={{ color: AI_TEXT_SECONDARY }}
                >
                  <Info className="h-4 w-4" strokeWidth={1.9} />
                </button>
              </div>

              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  role="dialog"
                  aria-label={step.action}
                  onMouseEnter={() => setOpen(i)}
                  onMouseLeave={() => leave(i)}
                  // Anchored to the ⓘ, not the chip: right-aligned to the chip so
                  // the pointer lands on the icon (px-4 + half the 24px button
                  // = 28px from the edge, minus half the 12px pointer).
                  className="absolute bottom-full right-0 z-30 w-[22rem] pb-3"
                >
                  <div
                    className="relative rounded-2xl bg-white p-5 shadow-[0_24px_60px_-20px_rgba(139,92,246,0.35)]"
                    style={{ border: "1px solid oklch(0.78 0.06 295 / 0.4)" }}
                  >
                    <span
                      aria-hidden
                      className="absolute -bottom-[7px] right-[22px] h-3 w-3 rotate-45 bg-white"
                      style={{ borderRight: "1px solid oklch(0.78 0.06 295 / 0.4)", borderBottom: "1px solid oklch(0.78 0.06 295 / 0.4)" }}
                    />
                    <p className="flex items-start gap-2 font-display text-[15px] font-bold leading-snug" style={{ color: AI_TEXT_PRIMARY }}>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: TONE_DOT[step.tone] }} />
                      {step.action}
                    </p>
                    <p className="mt-3 border-t pt-3 text-[13.5px] leading-relaxed" style={{ color: AI_TEXT_PRIMARY, borderColor: "oklch(0.7 0.09 295 / 0.55)" }}>
                      {highlightNumbers(withPeriod(step.why), "light", "signed")}
                    </p>
                    {/* The figures the step rests on: the model names them,
                        the values are read from the data. One row each, so
                        labels are written out in full, never truncated. */}
                    {evidence.length > 0 && (
                      <dl className="mt-4 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "oklch(0.7 0.09 295 / 0.55)" }}>
                        {evidence.map((e) => (
                          <div key={e.label} className="flex items-baseline justify-between gap-4">
                            <dt className="text-[12.5px] font-medium" style={{ color: AI_TEXT_SECONDARY }}>
                              {e.label}:
                            </dt>
                            <dd className="shrink-0 text-right tabular-nums">
                              <span className="font-stat text-[14px] font-semibold" style={{ color: AI_TEXT_PRIMARY }}>
                                {e.value}
                              </span>
                              {e.previous && (
                                <span className="ml-1.5 text-[11.5px]" style={{ color: AI_TEXT_PRIMARY, opacity: 0.55 }}>
                                  föregående {e.previous}
                                </span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
