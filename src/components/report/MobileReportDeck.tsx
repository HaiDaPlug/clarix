"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PageThumb } from "./slides/SlidePages";
import {
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  Plug,
} from "lucide-react";
import type { AiInsightsPayload } from "@/lib/ai-insights/types";
import { deriveInsights } from "@/lib/engine/derive-insights";
import { deriveSignalCards } from "@/lib/engine/signal-cards";
import { deriveSlideHeadline } from "@/lib/engine/slide-headlines";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { withPeriod } from "@/lib/utils/text";
import type { ReportData } from "@/types/schema";
import type { SlideData } from "./slide-data";
import { channelColor } from "./channel-colors";
import { MobileNextSteps } from "./MobileNextSteps";
import { STEP_TONE, stepEvidence } from "./next-step-parts";
import { buildEvidenceRegistry } from "@/lib/ai-insights/evidence";
import {
  ACCENT,
  AI_BORDER,
  AI_GRADIENT,
  AI_SHIMMER,
  AI_TEXT_PRIMARY,
  AI_TEXT_SECONDARY,
  TREND_NEG,
  TREND_POS,
} from "./tokens";

const SECTION_LINKS = [
  ["Översikt", "mobile-summary"],
  ["Nyckeltal", "mobile-kpis"],
  ["Kanaler", "mobile-channels"],
  ["Affär", "mobile-conversion"],
  ["Sidor", "mobile-pages"],
  ["Bedömning", "mobile-insight"],
  ["Nästa steg", "mobile-recommendations"],
  ["Summering", "mobile-recap"],
] as const;


function fmt(value: number | null) {
  return value == null ? "—" : value.toLocaleString("sv-SE");
}

const MOBILE_STAT = "font-stat mt-auto pt-4 text-[1.7rem] font-bold leading-none tracking-tight tabular-nums";

/** Long, thin stand-in for a value that does not exist yet — see SlideKpis. */
function Dash() {
  return <span className="block h-[0.175rem] w-[2.75rem] rounded-full bg-foreground" />;
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs font-medium text-foreground/45">Ingen jämförelse</span>;
  const positive = value > 0;
  return (
    <span className="text-sm font-bold tabular-nums" style={{ color: positive ? TREND_POS : TREND_NEG }}>
      {positive ? "+" : ""}{value}%
    </span>
  );
}

function LoadingLines() {
  return (
    <div className="space-y-2" aria-label="AI-insikt laddas">
      {[92, 76, 58].map((width) => (
        <div key={width} className="h-4 animate-pulse rounded-full" style={{ width: `${width}%`, background: AI_SHIMMER }} />
      ))}
    </div>
  );
}

function Section({
  id,
  number,
  title,
  sub,
  children,
}: {
  id: string;
  number: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 py-8">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>{number}</p>
        <h2 className="font-display mt-2 text-[2rem] font-bold leading-[1.05] tracking-tight text-foreground">
          {title}<span style={{ color: "#FF6B55" }}>.</span>
        </h2>
        {sub && <p className="mt-2 text-[15px] leading-relaxed text-foreground/60">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function InsightCard({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-5 shadow-[0_20px_50px_-28px_rgba(139,92,246,0.35)]"
      style={{ background: AI_GRADIENT, borderColor: AI_BORDER }}
    >
      <div className="pointer-events-none absolute -right-34 -top-38 h-84 w-84 rounded-full" style={{ background: "radial-gradient(circle, oklch(0.827 0.119 306 / 0.2) 0%, oklch(0.827 0.119 306 / 0.12) 40%, transparent 72%)" }} />
      <div className="relative">
        {label && <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: AI_TEXT_SECONDARY }}>{label}</p>}
        <div className="space-y-3 text-[16px] font-normal leading-[1.65]" style={{ color: AI_TEXT_PRIMARY }}>{children}</div>
      </div>
    </div>
  );
}

export function MobileReportLoading() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6" aria-label="Rapporten laddas">
      <div className="h-52 animate-pulse rounded-[2rem] bg-background" />
      {[1, 2, 3].map((item) => (
        <div key={item} className="space-y-3 rounded-3xl border border-border bg-background/80 p-5">
          <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

export function MobileReportDeck({
  data,
  reportData,
  aiInsights,
  aiLoading = false,
}: {
  data: SlideData;
  reportData: ReportData;
  aiInsights: AiInsightsPayload | null;
  aiLoading?: boolean;
}) {
  const insights = deriveInsights(reportData);
  // The AI verdict the dashboard and desktop slide lead with; the lookup
  // table only when generation failed. Section adds its own coral full stop.
  const headline = aiInsights?.dashboard_hero?.headline.trim().replace(/[.!?…]+$/, "") || deriveSlideHeadline(insights);
  const signals = deriveSignalCards(insights);
  const aiInsight = aiInsights?.slide_insight;
  const domain = data.clientDomain ?? "example.com";
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  // topChannels is already sorted by visits upstream, so the first one is the biggest.
  const topChannel = data.topChannels[0] ?? null;
  const TopIcon = topChannel?.icon;
  // No leads means tracking is off, not a real zero — the card says so instead.
  const noLeads = !data.leads;

  // AI-only sections are left out when generation returned nothing for them;
  // while it runs they stay and show placeholders. Nothing here is a stand-in.
  const steps = aiInsights?.slide_next_steps ?? null;
  const recapLines = aiInsights?.slide_recap?.map((r) => r.body) ?? null;
  const showSteps = aiLoading || !!steps?.length;
  const showRecap = aiLoading || !!recapLines?.length;
  const registry = buildEvidenceRegistry(reportData);
  const conclusion = (aiInsight?.bottom_line ?? deriveSlideHeadline(insights)).trim().replace(/[.!?…]+$/, "");
  const sectionLinks = SECTION_LINKS.filter(([, id]) => (id !== "mobile-recommendations" || showSteps) && (id !== "mobile-recap" || showRecap));

  return (
    <article className="mx-auto w-full max-w-xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] text-foreground">
      <nav
        aria-label="Rapportens avsnitt"
        className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-y border-border/60 bg-[oklch(0.965_0.005_270/0.94)] px-4 py-3 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sectionLinks.map(([label, id]) => (
          <a key={id} href={`#${id}`} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-border/70 bg-background/80 px-4 text-xs font-semibold text-foreground">
            {label}
          </a>
        ))}
      </nav>

      <header className="relative overflow-hidden rounded-b-[2rem] px-5 pb-10 pt-9" style={{ background: "linear-gradient(145deg, #ffffff 0%, #fbf6f8 55%, #f1edff 100%)" }}>
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle, oklch(0.827 0.119 306 / 0.25) 0%, oklch(0.827 0.119 306 / 0.15) 40%, transparent 72%)" }} />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>Clarix mobilrapport</p>
          <h1 className="font-display mt-5 text-[2.8rem] font-extrabold leading-[0.98] tracking-[-0.035em] text-[#1a1714]">
            {data.clientName ?? "Din webbplats"}<span style={{ color: "#FF6B55" }}>.</span>
          </h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-[#1a1714]/70">{data.period}</p>
          {data.clientDomain && <p className="mt-1 text-sm text-[#1a1714]/50">{data.clientDomain}</p>}
        </div>
      </header>

      <Section id="mobile-summary" number="01 — Översikt" title={headline} sub="Det viktigaste från perioden, anpassat för att läsas på telefon.">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background/90 p-4">
            <p className="text-xs font-semibold text-foreground/50">Besök</p>
            <p className="font-stat mt-2 text-3xl font-bold tabular-nums">{fmt(data.visits)}</p>
            <div className="mt-2"><Delta value={data.trafficDelta} /></div>
          </div>
          <div className="rounded-2xl border border-border bg-background/90 p-4">
            <p className="text-xs font-semibold text-foreground/50">Personer</p>
            <p className="font-stat mt-2 text-3xl font-bold tabular-nums">{fmt(data.people)}</p>
            <div className="mt-2"><Delta value={data.peopleDelta} /></div>
          </div>
        </div>
        <div className="mt-3">
          <InsightCard label="Därför">
            {aiLoading ? <LoadingLines /> : aiInsights?.slide_hero ? <p>{highlightNumbers(withPeriod(aiInsights.slide_hero), "light")}</p> : null}
            <MobileNextSteps reportData={reportData} aiInsights={aiInsights} aiLoading={aiLoading} moreHref="#mobile-recommendations" />
          </InsightCard>
        </div>
      </Section>

      <Section id="mobile-kpis" number="02 — Nyckeltal" title="Snabb överblick" sub="Periodens viktigaste siffror jämfört med föregående period.">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Besök", delta: data.trafficDelta, span: false, body: <p className={MOBILE_STAT}>{fmt(data.visits)}</p> },
            { label: "Personer", delta: data.peopleDelta, span: false, body: <p className={MOBILE_STAT}>{fmt(data.people)}</p> },
            {
              label: "Din populäraste kanal",
              delta: topChannel?.delta ?? null,
              span: false,
              body: topChannel && TopIcon ? (
                <div className="mt-auto flex items-center gap-3 pt-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${channelColor(topChannel.name)}20` }}
                  >
                    <TopIcon className="h-[18px] w-[18px]" style={{ color: channelColor(topChannel.name) }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-tight">{topChannel.name}</p>
                    <p className="mt-0.5 text-xs font-medium text-foreground/55">{topChannel.pct}% av alla besök</p>
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex h-10 items-center pt-4"><Dash /></div>
              ),
            },
            {
              label: "Leads",
              delta: data.leadsDelta,
              span: noLeads,
              body: noLeads ? (
                <div className="mt-auto flex flex-col gap-3 pt-5">
                  <Dash />
                  <p className="text-[13px] font-medium leading-[1.5] text-foreground/60">
                    Du har inte konverteringsspårning på. Sätt på det för att mäta hur många affärer som konverteras.
                  </p>
                </div>
              ) : (
                <p className={MOBILE_STAT}>{fmt(data.leads)}</p>
              ),
            },
          ].map((k) => (
            <div
              key={k.label}
              className={`flex min-h-36 flex-col rounded-2xl border border-border bg-background/90 p-4 shadow-sm${k.span ? " col-span-2" : ""}`}
            >
              <p className="text-sm font-semibold text-foreground/60">{k.label}</p>
              {k.body}
              <div className="mt-2"><Delta value={k.delta} /></div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="mobile-channels" number="03 — Kanaler" title="Dina bästa trafikkällor" sub="Källorna som driver flest besök till sidan.">
        <div className="space-y-3">
          {data.topChannels.map((channel) => {
            const Icon = channel.icon;
            const color = channelColor(channel.name);
            const hasSubChannels = !!channel.subChannels?.length;
            const isExpanded = hasSubChannels && expandedChannel === channel.name;
            return (
              <div
                key={channel.name}
                className="rounded-2xl border border-border bg-background/90 p-4"
                role={hasSubChannels ? "button" : undefined}
                tabIndex={hasSubChannels ? 0 : undefined}
                aria-expanded={hasSubChannels ? isExpanded : undefined}
                onClick={hasSubChannels ? () => setExpandedChannel(isExpanded ? null : channel.name) : undefined}
                onKeyDown={
                  hasSubChannels
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedChannel(isExpanded ? null : channel.name);
                        }
                      }
                    : undefined
                }
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f` }}><Icon className="h-4 w-4" style={{ color }} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold leading-tight">{channel.name}</p>
                      {hasSubChannels && (
                        <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                          <ChevronDown className="h-3.5 w-3.5 text-foreground/40" />
                        </motion.span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/50">{channel.sub}</p>
                  </div>
                  <p className="font-stat text-2xl font-bold tabular-nums">{channel.pct}%</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${channel.pct}%`, background: color }} /></div>
                <div className="mt-2 flex items-center justify-between text-xs"><span className="text-foreground/50">{fmt(channel.visits)} besök</span><Delta value={channel.delta} /></div>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3">
                        {channel.subChannels!.map((sub) => {
                          const SubIcon = sub.icon;
                          return (
                            <div key={sub.source} className="flex items-center gap-2.5">
                              <SubIcon className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
                              <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground/70">{sub.name}</p>
                              <span className="text-xs tabular-nums text-foreground/50">{fmt(sub.visits)}</span>
                              <span className="font-stat text-xs font-bold tabular-nums text-foreground/70">{sub.pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="mobile-conversion" number="04 — Affär" title={data.hasConversions ? "Affären bakom trafiken" : "Du ser trafiken — men inte affären"} sub={data.hasConversions ? "Alla mätta konverteringar under perioden." : "Konverteringsspårning är inte aktiverad ännu."}>
        {data.hasConversions ? (
          <div className="rounded-3xl border border-border bg-background/90 p-5"><p className="text-sm text-foreground/55">Konverteringar</p><p className="font-stat mt-2 text-4xl font-bold tabular-nums">{fmt(data.leads)}</p><div className="mt-2"><Delta value={data.leadsDelta} /></div></div>
        ) : (
          <InsightCard label="Vad du får med spårning">
            <ul className="space-y-3">{["Antal leads per kanal", "Vilka sidor som skapar affärer", "Bästa kampanj baserat på riktig data"].map((item) => <li key={item} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: ACCENT }} /><span>{item}</span></li>)}</ul>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold" style={{ color: ACCENT }}><Plug className="h-4 w-4" /> Koppla på konverteringsspårning</div>
          </InsightCard>
        )}
      </Section>

      <Section id="mobile-pages" number="05 — Sidor" title="Dina mest besökta sidor" sub="Sidorna som drog mest trafik under perioden.">
        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-background/90">
          {data.topPages.map((page) => {
            const href = `https://${domain}${page.p}`;
            const letter = domain.replace("www.", "").slice(0, 1).toUpperCase();
            return <a key={page.p} href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-20 items-center gap-3 px-4 py-3 text-foreground transition-colors hover:bg-muted/50"><PageThumb domain={domain} path={page.p} fallbackLetter={letter} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{page.title ?? page.p}</p><p className="mt-1 truncate text-xs text-foreground/45">{page.p}</p></div><div className="text-right"><p className="font-stat text-xl font-bold tabular-nums">{fmt(page.v)}</p><Delta value={page.d} /></div></a>;
          })}
        </div>
      </Section>

      <Section id="mobile-insight" number="06 — Bedömning" title={conclusion} sub="Slutsatsen, och vad den vilar på.">
        {signals.length > 0 && <ul className="mb-3 space-y-3">{signals.map((signal) => <li key={signal.label} className="flex items-start gap-3 rounded-2xl border border-border bg-background/90 p-4"><span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: signal.positive ? TREND_POS : TREND_NEG }} /><div><p className="font-semibold">{signal.label}</p><p className="mt-1 text-sm leading-relaxed text-foreground/60">{signal.body}</p></div></li>)}</ul>}
        {(aiLoading || aiInsight) && (
          <InsightCard label="Därför">
            {aiLoading || !aiInsight ? <LoadingLines /> : aiInsight.body.map((paragraph) => <p key={paragraph}>{highlightNumbers(withPeriod(paragraph), "light")}</p>)}
          </InsightCard>
        )}
      </Section>

      {showSteps && (
        <Section id="mobile-recommendations" number="07 — Nästa steg" title="Nästa steg" sub="Vad som gör störst skillnad just nu, och varför.">
          <div className="space-y-3">
            {aiLoading || !steps
              ? [0, 1].map((i) => <div key={i} className="rounded-3xl border border-border bg-background/95 p-5"><LoadingLines /></div>)
              : steps.map((step, index) => {
                  const tone = STEP_TONE[step.tone];
                  const evidence = stepEvidence(step, registry);
                  return (
                    <article key={index + step.action} className="rounded-3xl border bg-background/95 p-5 shadow-sm" style={{ borderColor: tone.border }}>
                      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60">
                        <span className="h-2 w-2 rounded-full" style={{ background: tone.dot }} aria-hidden />
                        {tone.label}
                      </p>
                      <h3 className="font-display mt-3 text-[22px] font-bold leading-tight">{step.action}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-foreground/75">{highlightNumbers(withPeriod(step.why), "light", "signed")}</p>
                      {evidence.length > 0 && (
                        <dl className="mt-4 space-y-1.5 border-t border-border pt-3">
                          {evidence.map((e) => (
                            <div key={e.label} className="flex items-baseline justify-between gap-3">
                              <dt className="text-[13px] text-foreground/60">{e.label}</dt>
                              <dd className="shrink-0 text-right tabular-nums">
                                <span className="font-stat text-[15px] font-semibold">{e.value}</span>
                                {e.previous && <span className="ml-1.5 text-[11.5px] text-foreground/50">föreg. {e.previous}</span>}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </article>
                  );
                })}
          </div>
        </Section>
      )}

      {showRecap && (
        <Section id="mobile-recap" number={showSteps ? "08 — Summering" : "07 — Summering"} title="Kort summerat" sub="Det viktigaste att ta med sig från perioden.">
          <ul className="space-y-3">
            {aiLoading || !recapLines
              ? [0, 1, 2].map((i) => <li key={i} className="rounded-2xl border border-border bg-background/90 p-4"><LoadingLines /></li>)
              : recapLines.map((line) => (
                  <li key={line} className="flex items-start gap-3 rounded-2xl border border-border bg-background/90 p-4">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: "#FF6B55" }} aria-hidden />
                    <p className="text-[16px] font-medium leading-snug">{highlightNumbers(withPeriod(line), "light")}</p>
                  </li>
                ))}
          </ul>
        </Section>
      )}

      <div className="mt-10"><InsightCard><Lightbulb className="h-5 w-5" style={{ color: ACCENT }} /><p className="font-display text-2xl font-bold">Vill du gå igenom rapporten tillsammans?</p><p className="text-sm font-normal">Ta med rapporten till nästa möte eller öppna den i landskap för presentationsvyn.</p><Link href="/dashboard" className="mt-2 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold text-white" style={{ background: ACCENT }}>Till dashboarden</Link></InsightCard></div>
    </article>
  );
}
