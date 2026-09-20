"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowRight } from "lucide-react";
import { ReportData } from "@/types/schema";
import { useLocale } from "@/lib/i18n";
import { NoiseTexture } from "@/components/ui/noise-texture";
import type { AiInsightsPayload } from "@/lib/hooks/useAiInsights";
import { FALLBACK_TEXT } from "@/lib/hooks/useAiInsights";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

// Splits a sentence from its terminal mark so the panel can set the full stop
// in coral — the same punctuation the report puts on every heading.
function splitTerminal(text: string): { body: string; mark: string } {
  const trimmed = text.trim();
  const m = trimmed.match(/([.!?…])$/);
  return m ? { body: trimmed.slice(0, -1), mark: m[1] } : { body: trimmed, mark: "." };
}

const COPY = {
  sv: {
    label: "Strategisk sammanfattning",
    sample: "Exempel",
    explore: "Se vad som driver resultatet",
    writing: "Sammanfattningen skrivs utifrån periodens siffror.",
    noInterpretation: "Siffrorna är på plats. Tolkningen saknas för perioden",
    noInterpretationSub: "Sammanfattningen kunde inte skapas den här gången. Siffrorna nedan och rapporten är kompletta.",
    noDataSub: "Anslut en datakälla så skriver Clarix sammanfattningen utifrån era siffror.",
    busy: "Sammanfattning skapas",
  },
  en: {
    label: "Strategic summary",
    sample: "Example",
    explore: "See what drives the result",
    writing: "The summary is being written from this period's numbers.",
    noInterpretation: "The numbers are in. The interpretation is missing for this period",
    noInterpretationSub: "The summary could not be written this time. The numbers below and the report are complete.",
    noDataSub: "Connect a data source and Clarix writes the summary from your numbers.",
    busy: "Summary is being written",
  },
} as const;

/**
 * The strategic summary, and deliberately the whole first screen: the
 * conclusion for the period on the left, the sentence that backs it up and
 * the way into the report on the right. The KPIs wait below the fold on
 * purpose — the owner reads the verdict first, then the evidence — and the
 * cue at the bottom invites the scroll.
 *
 * The aurora gradient is the one signature surface on the dashboard, kept at
 * Hai's request. What went: the colored drop shadow and the blurred glass
 * card; what stayed: the wash, the glows, a little grain, and the words.
 */
export function DashboardHero({
  data,
  aiInsights,
  loading,
  sample = false,
  exploreTargetId,
}: {
  data: ReportData;
  aiInsights: AiInsightsPayload | null;
  loading: boolean;
  /** The numbers are sample data, so the sample's own summary is the honest
   *  text to show — no insights are generated for a workspace that has none. */
  sample?: boolean;
  /** Element id of the metrics section; when set, the panel ends with a cue
   *  that scrolls there. Normal scrolling is never restricted. */
  exploreTargetId?: string;
}) {
  const { locale, t } = useLocale();
  const params = useSearchParams();
  const prefersReduced = useReducedMotion();
  const summary = data.executiveSummary;
  if (!summary) return null;

  const copy = COPY[locale === "sv" ? "sv" : "en"];
  const reportHref = `/report${params.toString() ? `?${params.toString()}` : ""}`;
  const hero = aiInsights?.dashboard_hero;
  const useSample = sample && !hero;
  const hasMetrics = Boolean(data.trafficOverview || data.seoOverview || data.paidOverview);

  // Three honest readings of "no AI copy": the sample's own summary, metrics
  // without an interpretation, or no metrics at all.
  const headline = hero?.headline
    ?? (useSample ? summary.headline : hasMetrics ? copy.noInterpretation : FALLBACK_TEXT);
  const sub = hero?.sub
    ?? (useSample ? summary.subheadline ?? null : hasMetrics ? copy.noInterpretationSub : copy.noDataSub);
  const { body, mark } = splitTerminal(headline);
  const eyebrow = [copy.label, useSample ? copy.sample : null, data.meta.period.label].filter(Boolean).join(" · ");

  const scrollToMetrics = () => {
    if (!exploreTargetId) return;
    document.getElementById(exploreTargetId)?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
  };

  const cta = (
    <Link
      href={reportHref}
      className="inline-flex min-h-10 items-center gap-2 px-4 text-sm transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)] focus-visible:ring-offset-2"
      style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)", borderRadius: "var(--radius-control)", fontWeight: 700, textDecoration: "none" }}
    >
      {t.dashboard.hero.readReport}
      <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
    </Link>
  );

  const cardStyle: React.CSSProperties = {
    background: "var(--insight-card)",
    border: "1px solid var(--insight-border)",
    borderRadius: "var(--radius-card)",
  };

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      aria-busy={loading}
      className="relative flex flex-1 flex-col overflow-hidden p-5 sm:p-10 lg:p-14"
      style={{
        background: "var(--insight-gradient)",
        border: "1px solid var(--insight-border)",
        borderRadius: "var(--radius-panel)",
      }}
    >
      {/* The aurora: a gradient wash with two soft pools of colour and a
          little grain. Both themes define the values, so it holds in dark. */}
      <div
        className="pointer-events-none absolute -left-20 -top-32 h-80 w-80 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--insight-glow-a), transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-10 h-96 w-96 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--insight-glow-b), transparent 70%)" }}
        aria-hidden
      />
      <NoiseTexture preset="fine" blendMode="soft-light" opacity={0.3} />

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 content-center items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left: label + the conclusion. The headline is the one place every
            number is lit up; the panel beside it stays calmer. */}
        <div className="flex flex-col gap-3 lg:col-span-5">
          <p className="eyebrow" style={{ color: "var(--insight-accent)" }}>{eyebrow}</p>
          {loading ? (
            <div className="flex flex-col gap-3" aria-label={copy.busy}>
              <div className="h-8 w-[95%] rounded-md sm:h-10" style={{ background: "var(--insight-border)", opacity: 0.55 }} />
              <div className="h-8 w-[85%] rounded-md sm:h-10" style={{ background: "var(--insight-border)", opacity: 0.55 }} />
              <div className="h-8 w-[55%] rounded-md sm:h-10" style={{ background: "var(--insight-border)", opacity: 0.55 }} />
              <p className="mt-1" style={{ fontSize: "14px", color: "var(--insight-muted)" }}>{copy.writing}</p>
            </div>
          ) : (
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(2rem, 1.4rem + 1.8vw, 3rem)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
                color: "var(--insight-text)",
                textWrap: "balance",
              }}
            >
              {highlightNumbers(body, "light", "all")}
              <span style={{ color: "var(--brand-coral)" }}>{mark}</span>
            </h2>
          )}
        </div>

        {/* Right: the sentence behind it, and the way into the report */}
        <div className="lg:col-span-7">
          {loading ? (
            <div className="p-5 sm:p-7 lg:p-8" style={cardStyle}>
              <div className="flex flex-col gap-3">
                <div className="h-6 w-[92%] rounded-md sm:h-7" style={{ background: "var(--insight-border)", opacity: 0.45 }} />
                <div className="h-6 w-[88%] rounded-md sm:h-7" style={{ background: "var(--insight-border)", opacity: 0.45 }} />
                <div className="h-6 w-[80%] rounded-md sm:h-7" style={{ background: "var(--insight-border)", opacity: 0.45 }} />
                <div className="h-6 w-[45%] rounded-md sm:h-7" style={{ background: "var(--insight-border)", opacity: 0.45 }} />
              </div>
              <div className="mt-6 h-10 w-40 rounded-[10px]" style={{ background: "var(--insight-border)", opacity: 0.45 }} />
            </div>
          ) : (
            <div className="p-5 sm:p-7 lg:p-8" style={cardStyle}>
              {sub && (
                <p style={{ fontSize: "clamp(1.15rem, 1rem + 0.6vw, 1.55rem)", lineHeight: 1.5, fontWeight: 400, color: "var(--insight-text)" }}>
                  {highlightNumbers(sub, "light", "signed")}
                </p>
              )}
              <div className={sub ? "mt-6" : undefined}>{cta}</div>
            </div>
          )}
        </div>
      </div>

      {/* The invitation to keep going. A cue, not a gate. */}
      {exploreTargetId && !loading && (
        <div className="relative z-10 mt-8 sm:mt-10">
          <button
            type="button"
            onClick={scrollToMetrics}
            className="group inline-flex items-center gap-2.5 rounded-full py-1 pr-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)] focus-visible:ring-offset-2"
            style={{ color: "var(--insight-muted)", fontSize: "13.5px", fontWeight: 600, background: "transparent", border: "none", cursor: "pointer" }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-y-0.5"
              style={{ border: "1px solid var(--insight-border)", background: "var(--insight-card)" }}
              aria-hidden
            >
              <ArrowDown className="h-4 w-4" strokeWidth={2} />
            </span>
            {copy.explore}
          </button>
        </div>
      )}
    </motion.section>
  );
}
