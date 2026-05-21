"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  CheckCircle2,
  Compass,
  Globe,
  Lightbulb,
  Mail,
  Maximize2,
  Megaphone,
  Minimize2,
  MousePointerClick,
  PenSquare,
  Plug,
  Search as SearchIcon,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  ConnectableSource,
  ConnectedSource,
  mergeReportData,
} from "@/lib/google/connected-sources";
import { useDateRange, DATE_PRESETS, presetToRange, type DatePresetId } from "@/lib/google/date-presets";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import { deriveInsights } from "@/lib/engine/derive-insights";
import { deriveSlideHeadline } from "@/lib/engine/slide-headlines";
import {
  AI_INSIGHTS_FALLBACK_TEXT,
  AiInsightsPayloadSchema,
  type AiInsightsPayload,
} from "@/lib/ai-insights/types";
import {
  hashAiInsightMetrics,
  isFreshAiInsightsCache,
} from "@/lib/ai-insights/cache";
import type { ReportData } from "@/types/schema";

/* ─── Design tokens ──────────────────────────────────────────────────────── */

const TREND_POS = "oklch(0.74 0.17 155)";
const TREND_NEG = "oklch(0.7 0.18 22)";
const TREND_POS_BG = "oklch(0.74 0.17 155 / 0.14)";
const TREND_NEG_BG = "oklch(0.7 0.18 22 / 0.14)";
const ACCENT = "oklch(0.5 0.18 290)";

/* ─── Shimmer ────────────────────────────────────────────────────────────── */

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 10,
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        ...style,
      }}
    />
  );
}

function SlideShimmer() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <Shimmer style={{ height: 52, width: "55%", borderRadius: 12 }} />
      <Shimmer style={{ height: 20, width: "20%", borderRadius: 8 }} />
      <div className="flex gap-4 flex-1">
        <div className="flex-1 flex flex-col gap-3">
          <Shimmer style={{ height: "60%", borderRadius: 16 }} />
          <Shimmer style={{ height: "35%", borderRadius: 16 }} />
        </div>
        <Shimmer style={{ width: 196, borderRadius: 16 }} />
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fmtNum = (n: number) => n.toLocaleString("sv-SE");

const sign = (n: number | null): string | null =>
  n === null ? null : n >= 0 ? `+${n}%` : `−${Math.abs(n)}%`;

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function TrendPill({
  delta,
  positive,
  size = "md",
}: {
  delta: string | null;
  positive: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1",
    md: "px-3.5 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  } as const;
  const icon =
    size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  if (delta === null) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold tabular-nums ${sizes[size]}`}
        style={{ color: "oklch(0.6 0.01 270)", background: "oklch(0.94 0.005 270)" }}
      >
        —
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tabular-nums ${sizes[size]}`}
      style={{
        color: positive ? TREND_POS : TREND_NEG,
        background: positive ? TREND_POS_BG : TREND_NEG_BG,
      }}
    >
      {positive ? (
        <ArrowUpRight className={icon} strokeWidth={2.8} />
      ) : (
        <ArrowDownRight className={icon} strokeWidth={2.8} />
      )}
      {delta}
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] font-semibold uppercase tracking-[0.26em] text-foreground">
      {children}
    </p>
  );
}

function SlideHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem]">
        {children}<span style={{ color: "#FF6B55" }}>.</span>
      </h1>
      {sub ? (
        <p className="mt-3 text-[21px] text-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

function AISummary({
  children,
  label = "Strategisk sammanfattning",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/20 p-6 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)] sm:p-8"
      style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
    >
      <NoiseTexture preset="cinematic" blendMode="overlay" />
      <div className="relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
          {label}
        </p>
        <div className="mt-2 space-y-3 text-[1.15rem] font-medium leading-[1.6] tracking-[-0.01em] text-white/95 sm:text-[1.25rem] [&_span]:text-white [&_span]:font-bold">
          {children}
        </div>
      </div>
    </div>
  );
}

const pos = (s: string) => (
  <span className="font-semibold" style={{ color: TREND_POS }}>
    {s}
  </span>
);
const neg = (s: string) => (
  <span className="font-semibold" style={{ color: TREND_NEG }}>
    {s}
  </span>
);

/* ─── Slide data shape (driven by real data where available) ─────────────── */

interface SlideData {
  visits: number;
  prevVisits: number;
  trafficDelta: number | null;
  people: number;
  peopleDelta: number | null;
  timeDelta: number | null;
  leads: number;
  leadsDelta: number | null;
  period: string;
  bounceRate: number | null;
  avgDuration: number | null;
  topChannels: {
    name: string;
    sub: string;
    tip: { title: string; body: string; example?: string };
    pct: number;
    visits: number;
    delta: number | null;
    icon: React.ElementType;
    featured?: boolean;
  }[];
  topPages: { p: string; v: number; d: number | null }[];
  timeSeries: { date: string; sessions: number }[];
  hasConversions: boolean;
}

function buildSlideData(reportData: ReportData | null): SlideData {
  const traffic = reportData?.trafficOverview;
  const kpi = reportData?.kpiSnapshot;
  const period = reportData?.meta?.period?.label ?? "Senaste perioden";

  // Sessions / visits — no fake fallbacks
  const visits = traffic?.totalSessions?.value ?? 0;
  const prevVisits = traffic?.totalSessions?.previousValue ?? 0;
  const trafficDelta =
    prevVisits > 0
      ? Math.round(((visits - prevVisits) / prevVisits) * 100)
      : null;

  // Users
  const organicVal = traffic?.organicSessions?.value;
  const people = organicVal ?? 0;
  const prevPeople = traffic?.organicSessions?.previousValue ?? 0;
  const peopleDelta =
    prevPeople > 0
      ? Math.round(((people - prevPeople) / prevPeople) * 100)
      : null;

  // Engagement / bounce
  const bounceNow = traffic?.bounceRate?.value ?? null;
  const bouncePrev = traffic?.bounceRate?.previousValue ?? null;
  const timeDelta =
    bounceNow != null && bouncePrev != null && bouncePrev > 0
      ? Math.round(((bounceNow - bouncePrev) / bouncePrev) * 100)
      : null;
  const avgDuration = traffic?.avgSessionDuration?.value ?? null;

  // Leads / conversions
  const conv = reportData?.conversions;
  const leads = conv?.totalConversions?.value ?? 0;
  const prevLeads = conv?.totalConversions?.previousValue ?? 0;
  const leadsDelta =
    prevLeads > 0
      ? Math.round(((leads - prevLeads) / prevLeads) * 100)
      : null;

  // Channels
  const rawChannels = traffic?.channelBreakdown ?? [];
  const totalVisits =
    rawChannels.reduce((s, c) => s + (c.sessions ?? 0), 0) || visits;

  const channelIcons: Record<string, React.ElementType> = {
    organic: SearchIcon, "Organic Search": SearchIcon, "organic search": SearchIcon, "Organisk sökning": SearchIcon, "organisk sökning": SearchIcon,
    paid: Globe, "Paid Search": Globe, "paid search": Globe, "Betald sökning": Globe, "betald sökning": Globe,
    social: Megaphone, "Organic Social": Megaphone, "organic social": Megaphone, "Organisk social": Megaphone, "Sociala medier": Megaphone,
    direct: MousePointerClick, "Direct": MousePointerClick, "Direkt": MousePointerClick, "direkt": MousePointerClick,
    referral: Globe, "Referral": Globe, "Hänvisningar": Globe,
    email: Mail, "Email": Mail, "E-post": Mail,
  };

  const ORGANIC = { name: "Google (obetalt)", sub: "Besök från Googles vanliga sökresultat", tip: { title: "Vad är obetald söktrafik?", body: "Personer som hittade er via Googles vanliga sökresultat — utan att ni betalat för klicket.", example: "Ni rankar högt på 'redovisningsbyrå Stockholm' → någon klickar → ett organiskt besök." } };
  const PAID    = { name: "Google Ads", sub: "Köpt trafik från Google", tip: { title: "Vad är Google Ads-trafik?", body: "Besökare som kom via en betald annons i Google Sök eller Display-nätverket.", example: "Ni betalar per klick. Stoppar ni budgeten → slutar trafiken direkt." } };
  const SOCIAL  = { name: "Sociala medier", sub: "Besök från inlägg och delningar i sociala medier", tip: { title: "Vad är social trafik?", body: "Besökare som klickat in från sociala plattformar som LinkedIn, Facebook eller Instagram.", example: "Ett LinkedIn-inlägg som delas vidare kan ge en pik av social trafik." } };
  const DIRECT  = { name: "Direkttrafik", sub: "Besökare som skrev in adressen direkt", tip: { title: "Vad är direkttrafik?", body: "Besökare som redan känner till er och skrev in adressen direkt, eller kom via ett bokmärke.", example: "Befintliga kunder och varumärkeskännare dyker upp här." } };
  const REFERRAL = { name: "Referral", sub: "Länkar från andra sajter", tip: { title: "Vad är referraltrafik?", body: "Besökare som kom via en länk på en annan webbplats — t.ex. en partner, artikel eller katalog.", example: "En omnämning i en branschblogg kan ge hög-kvalitativa referralbesök." } };
  const EMAIL   = { name: "E-post", sub: "Nyhetsbrev & utskick", tip: { title: "Vad är e-posttrafik?", body: "Besökare som klickat via ett nyhetsbrev eller e-postutskick med UTM-spårning.", example: "Skickar ni ett månadsbrev med spårade länkar syns klicken här." } };
  const UNKNOWN = { name: "Okänd trafik", sub: "Trafik som inte kunnat kopplas till en källa", tip: { title: "Vad är okänd trafik?", body: "Trafik där systemet inte kunnat avgöra varifrån besökaren kom — ofta p.g.a. saknade spårparametrar.", example: "Klick från appar, direktmeddelanden eller skyddade webbläsare hamnar ofta här." } };

  const channelNames: Record<string, { name: string; sub: string; tip: { title: string; body: string; example?: string } }> = {
    // English GA4 keys
    "organic": ORGANIC, "Organic Search": ORGANIC, "organic search": ORGANIC,
    "paid": PAID, "Paid Search": PAID, "paid search": PAID,
    "social": SOCIAL, "Organic Social": SOCIAL, "organic social": SOCIAL, "Social": SOCIAL,
    "direct": DIRECT, "Direct": DIRECT,
    "referral": REFERRAL, "Referral": REFERRAL,
    "email": EMAIL, "Email": EMAIL,
    "unassigned": UNKNOWN, "Unassigned": UNKNOWN, "(not set)": UNKNOWN,
    // Swedish GA4 keys (what real data sends)
    "Organisk sökning": ORGANIC, "organisk sökning": ORGANIC,
    "Betald sökning": PAID, "betald sökning": PAID,
    "Organisk social": SOCIAL, "organisk social": SOCIAL, "Sociala medier": SOCIAL,
    "Direkt": DIRECT, "direkt": DIRECT,
    "Hänvisningar": REFERRAL, "hänvisningar": REFERRAL,
    "E-post": EMAIL, "e-post": EMAIL,
    "Ej tilldelad": UNKNOWN, "ej tilldelad": UNKNOWN,
  };

  const topChannels = rawChannels.slice(0, 6).map((c, i) => {
    const prev = c.previousSessions ?? 0;
    const curr = c.sessions ?? 0;
    const delta = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
    return {
      name: channelNames[c.channel]?.name ?? c.channel,
      sub: channelNames[c.channel]?.sub ?? "",
      tip: channelNames[c.channel]?.tip ?? { title: c.channel, body: "" },
      pct: totalVisits > 0 ? Math.round((curr / totalVisits) * 100) : 0,
      visits: curr,
      delta,
      icon: channelIcons[c.channel] ?? Globe,
      featured: i === 0,
    };
  });

  const rawSeries = traffic?.timeSeries ?? [];
  const timeSeries = rawSeries.map((p) => ({ date: p.date, sessions: p.value }));

  const rawPages = reportData?.topPages?.pages ?? [];
  const topPages = rawPages.slice(0, 6).map((p) => ({
    p: p.url,
    v: p.sessions ?? p.clicks ?? 0,
    d: null,
  }));

  // KPI snapshot — find metrics by label substring
  const kpiMetrics = kpi?.metrics ?? [];
  const convMetric = kpiMetrics.find((m) =>
    m.label.toLowerCase().includes("konver") ||
    m.label.toLowerCase().includes("conv"),
  );
  const hasConversions =
    (conv?.totalConversions?.value ?? convMetric?.value ?? 0) > 0;

  return {
    visits,
    prevVisits,
    trafficDelta,
    people,
    peopleDelta,
    timeDelta,
    leads,
    leadsDelta,
    period,
    bounceRate: bounceNow,
    avgDuration,
    topChannels,
    topPages,
    timeSeries,
    hasConversions,
  };
}

/* ─── Slides ─────────────────────────────────────────────────────────────── */


function SlideHero({
  d,
  headline,
  aiInsights,
}: {
  d: SlideData;
  headline: string;
  aiInsights: AiInsightsPayload | null;
}) {
  const hasData = d.trafficDelta !== null;
  const isPos = (d.trafficDelta ?? 0) > 0;
  const isNeg = (d.trafficDelta ?? 0) < 0;
  const aiHero = aiInsights?.slide_hero;

  const pillColor = !hasData
    ? { color: "oklch(0.55 0.01 270)", bg: "oklch(0.94 0.005 270)" }
    : isPos
    ? { color: TREND_POS, bg: TREND_POS_BG }
    : { color: TREND_NEG, bg: TREND_NEG_BG };

  return (
    <div className="flex h-full flex-col justify-between py-12">
      {/* Top: headline + stat */}
      <div className="text-center space-y-5 mt-16">
        <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem] whitespace-nowrap">
          {headline}<span style={{ color: "#FF6B55" }}>.</span>
        </h1>
        <p className="text-[1.6rem] leading-[1.4] text-foreground">
          {!hasData ? (
            "Ingen föregående period med data finns att jämföra."
          ) : (
            <>
              Trafiken under perioden har {isPos ? "gått upp" : "gått ner"}{" "}
              <span className="font-bold tabular-nums" style={{ color: pillColor.color }}>
                {sign(d.trafficDelta)!}
              </span>{" "}
              under perioden.
            </>
          )}
        </p>
      </div>

      {/* Middle: sparkline */}
      {d.timeSeries.length > 1 && (
        <div className="w-full h-[72px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.timeSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B55" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#FF6B55" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#FF6B55"
                strokeWidth={2}
                fill="url(#hero-spark)"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom: AI summary card */}
      <AISummary>
        {aiHero === null ? (
          <p>{AI_INSIGHTS_FALLBACK_TEXT}</p>
        ) : aiHero ? (
          <p>{aiHero}</p>
        ) : (
          <>
            <p>
              Den här perioden fick din hemsida {pos(fmtNum(d.visits))} besök —
              cirka {pos(fmtNum(Math.abs(d.visits - d.prevVisits)))} fler än förra
              månaden.
            </p>
            <p>
              Google var din starkaste trafikkälla och växte mest (
              {d.trafficDelta != null ? pos(sign(d.trafficDelta)!) : "—"}). Samtidigt tappade kontaktsidan trafik,
              vilket är viktigt eftersom leads ofta kommer därifrån.
            </p>
          </>
        )}
      </AISummary>
    </div>
  );
}

function SlideKpis({ d }: { d: SlideData }) {
  const kpis = [
    {
      l: "Besök",
      v: fmtNum(d.visits),
      d: sign(d.trafficDelta),
      p: (d.trafficDelta ?? null) !== null && d.trafficDelta! > 0,
      tip: { title: "Vad är ett besök?", body: "Varje gång någon laddar sidan räknas det som ett besök — oavsett om de har varit inne förut.", example: "Samma person som besöker tre gånger = 3 besök." },
    },
    {
      l: "Antal personer",
      v: fmtNum(d.people),
      d: sign(d.peopleDelta),
      p: (d.peopleDelta ?? null) !== null && d.peopleDelta! > 0,
      tip: { title: "Vad betyder antal personer?", body: "En person räknas bara en gång, även om den besöker flera gånger.", example: "1 person som går in 3 gånger = 3 besök, men bara 1 person här." },
    },
    {
      l: "Tid på sidan",
      v: "2 min 14 s",
      d: sign(d.timeDelta),
      p: (d.timeDelta ?? null) !== null && d.timeDelta! > 0,
      tip: { title: "Genomsnittlig besökstid", body: "Hur länge en genomsnittlig besökare stannar. Längre tid betyder att folk hittar det de söker.", example: "2 min 14 s innebär att besökarna läser — inte bara studsar vidare." },
    },
    {
      l: "Leads",
      v: fmtNum(d.leads),
      d: sign(d.leadsDelta),
      p: (d.leadsDelta ?? null) !== null && d.leadsDelta! > 0,
      tip: { title: "Vad räknas som ett lead?", body: "Varje registrerad konvertering — t.ex. ifyllt kontaktformulär, telefonklick eller köp.", example: "Kräver att konverteringsspårning är aktiverat i Google Analytics." },
    },
  ];
  return (
    <div className="space-y-8">
      <SlideHeading sub="Så ser perioden ut i siffror — jämfört med föregående månad.">
        Snabb överblick
      </SlideHeading>
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {kpis.map((k) => (
          <div
            key={k.l}
            className="flex h-full min-h-[200px] flex-col rounded-3xl border border-border bg-background/85 p-6 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[20px] font-semibold sm:text-[22px]">{k.l}</p>
                <InfoTooltip title={k.tip.title} body={k.tip.body} example={k.tip.example} side="above" />
              </div>
              <TrendPill delta={k.d} positive={k.p} size="md" />
            </div>
            <p className="mt-auto pt-6 font-display text-[4.2rem] font-semibold leading-none tracking-tight tabular-nums">
              {k.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTrend({ d }: { d: SlideData }) {
  const blue = "oklch(0.62 0.16 245)";

  // Top 3 channels by visit count + engagement metrics
  const topThree = d.topChannels.slice(0, 3);
  const rightStats: { label: string; value: string; delta?: number | null }[] = [
    ...topThree.map((c) => ({ label: c.name, value: c.visits.toLocaleString("sv-SE"), delta: c.delta })),
    ...(d.bounceRate != null ? [{ label: "Avvisningsfrekvens", value: `${d.bounceRate.toFixed(1)}%` }] : []),
    ...(d.avgDuration != null ? [{ label: "Genomsn. besökstid", value: `${Math.round(d.avgDuration)}s` }] : []),
  ];

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="font-display text-[3.1rem] font-bold leading-[1.05] tracking-tight lg:text-[3.8rem]">
          Så hittar besökarna till er<span style={{ color: "#FF6B55" }}>.</span>
        </h1>
        <p className="mt-1 text-[21px] text-foreground">{d.period}</p>
      </div>

      {/* Main row: chart left, stats right */}
      <div className="grid grid-cols-[1fr_196px] gap-4 flex-1 min-h-0">

        {/* Chart card */}
        <div className="rounded-2xl border border-border/60 bg-background/70 p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
            <div>
              <p className="text-[18px] font-semibold uppercase tracking-[0.2em] text-foreground">Totala besök</p>
              <p className="font-display text-[3.3rem] font-bold leading-none tracking-tight tabular-nums mt-0.5">
                {d.visits.toLocaleString("sv-SE")}
              </p>
            </div>
            <TrendPill delta={sign(d.trafficDelta)} positive={d.trafficDelta !== null && d.trafficDelta > 0} size="lg" />
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.timeSeries} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="r2-t-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={blue} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return v;
                    return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                <ReTooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(value) => [typeof value === "number" ? value.toLocaleString("sv-SE") : value, "Sessioner"]}
                  labelFormatter={(v) => {
                    const d = new Date(v);
                    if (isNaN(d.getTime())) return v;
                    return d.toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" });
                  }}
                />
                <Area type="monotone" dataKey="sessions" stroke={blue} strokeWidth={2} fill="url(#r2-t-blue)" dot={false} activeDot={{ r: 4, fill: blue, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Kanalfördelning baked into chart card footer */}
          {d.topChannels.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50 shrink-0">
              <div className="flex gap-5">
                {d.topChannels.slice(0, 5).map((ch) => (
                  <div key={ch.name} className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1 mb-1.5">
                      <span className="truncate text-[13px] text-foreground">{ch.name}</span>
                      <span className="shrink-0 text-[14px] font-bold tabular-nums">{ch.pct}%</span>
                    </div>
                    <div className="h-[4px] rounded-full bg-border/50 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, background: blue }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right stats column */}
        <div className="rounded-2xl border border-border/60 bg-background/70 px-5 py-5 flex flex-col min-h-0 overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground mb-3 shrink-0">
            Per kanal
          </p>
          <div className="flex flex-col flex-1 min-h-0 divide-y divide-border/50 overflow-hidden">
            {rightStats.map((s) => (
              <div key={s.label} className="flex flex-col justify-center py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground mb-1 leading-tight">
                  {s.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-[1.7rem] font-bold leading-none tracking-tight tabular-nums">
                    {s.value}
                  </p>
                  {s.delta !== undefined && (
                    <TrendPill delta={sign(s.delta ?? null)} positive={s.delta !== undefined && s.delta !== null && s.delta > 0} size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideChannels({ d }: { d: SlideData }) {
  return (
    <div className="space-y-6">
      <div>
        <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
          Dina bästa trafikkällor
        </SlideHeading>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {d.topChannels.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.name}
              className={`relative flex flex-col rounded-2xl border bg-background/90 p-5 shadow-[0_2px_4px_rgba(15,23,42,0.03),0_14px_36px_-22px_rgba(15,23,42,0.18)] ${
                c.featured ? "border-foreground/15 ring-1 ring-foreground/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: "linear-gradient(135deg, #FF4D9E 0%, #FF6B55 50%, #FFB830 100%)" }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[22px] font-semibold leading-tight">{c.name}</p>
                    {c.tip.title && <InfoTooltip title={c.tip.title} body={c.tip.body} example={c.tip.example} side="above" />}
                  </div>
                  <p className="truncate text-[20px] text-foreground">{c.sub}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-[38px] font-semibold tabular-nums">{c.pct}%</p>
                  <p className="mt-0.5 text-[20px] tabular-nums text-foreground">{fmtNum(c.visits)} besök</p>
                </div>
                <TrendPill delta={sign(c.delta)} positive={c.delta !== null && c.delta > 0} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlidePages({ d }: { d: SlideData }) {
  const rankColors = [
    { tint: "oklch(0.95 0.05 22)", fg: "oklch(0.55 0.18 22)" },
    { tint: "oklch(0.96 0.06 75)", fg: "oklch(0.55 0.14 75)" },
    { tint: "oklch(0.94 0.06 290)", fg: "oklch(0.5 0.18 290)" },
  ];
  const neutral = { tint: "oklch(0.97 0.005 270)", fg: "oklch(0.45 0.02 270)" };
  return (
    <div className="space-y-7">
      <div>
        <SlideHeading sub="De mest besökta sidorna under perioden, topp 6 ser du nedan:">
          Dina mest besökta sidor
        </SlideHeading>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {d.topPages.map((row, i) => {
          const positive = row.d !== null && row.d > 0;
          const r = i < 3 ? rankColors[i] : neutral;
          return (
            <div
              key={row.p}
              className="relative flex flex-col rounded-2xl border border-border bg-background/90 p-5 shadow-[0_2px_4px_rgba(15,23,42,0.03),0_14px_36px_-22px_rgba(15,23,42,0.18)]"
            >
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold tabular-nums"
                  style={{ background: r.tint, color: r.fg }}
                >
                  {i + 1}
                </span>
                <TrendPill
                  delta={sign(row.d)}
                  positive={positive}
                  size="sm"
                />
              </div>
              <p className="mt-4 truncate font-display text-[24px] font-semibold tracking-tight">
                {row.p}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <p className="font-display text-[30px] font-semibold tabular-nums">
                  {fmtNum(row.v)}
                </p>
                <span className="text-[20px] font-medium text-foreground">besök</span>
                <InfoTooltip title="Vad räknas som ett sidbesök?" body="Antal gånger den här sidan laddades under perioden." example="En besökare som återkommer tre gånger bidrar med 3 sidbesök." side="above" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlideStrategicInsight({
  d,
  aiInsights,
}: {
  d: SlideData;
  aiInsights: AiInsightsPayload | null;
}) {
  const aiInsight = aiInsights?.slide_insight;
  const signals = [
    {
      label: "Trafiken växer",
      body: "Google driver merparten av ökningen. Det beror på konsekvens — håll publiceringstempot uppe.",
      positive: true,
    },
    {
      label: "Engagemanget sjunker",
      body: "Fler hittar sidan, men stannar kortare. Det kan betyda att innehållet inte matchar det besökarna söker.",
      positive: false,
    },
    {
      label: "Kontaktsidan tappade synlighet",
      body: "Det är sidan där leads konverterar. En svagare ingång dit påverkar affären direkt.",
      positive: false,
    },
  ];

  return (
    <div className="grid h-full grid-cols-[1fr_1.05fr] gap-6 content-center">
      {/* Left: heading + signal list */}
      <div className="flex flex-col justify-center gap-6">
        <div>
          <h1 className="font-display text-[2.9rem] font-bold leading-[1.05] tracking-tight lg:text-[3.4rem]">
            Synligheten ökar.<br />Affärsvärdet fångas inte fullt ut<span style={{ color: "#FF6B55" }}>.</span>
          </h1>
          <p className="mt-3 text-[20px] text-foreground leading-relaxed">
            Vad siffrorna faktiskt betyder för er, bortom dashboarden.
          </p>
        </div>
        <ul className="space-y-3">
          {signals.map((s) => (
            <li
              key={s.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 px-5 py-4"
            >
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: s.positive ? TREND_POS : TREND_NEG, marginTop: 10 }}
              />
              <div>
                <p className="font-semibold text-[19px]">{s.label}</p>
                <p className="mt-0.5 text-[18px] leading-relaxed text-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: expanded summary card */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/20 p-8 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)] flex flex-col justify-between"
        style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10 flex flex-col h-full gap-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
            Det vi ser just nu
          </p>
          <div className="flex-1 space-y-4 text-[1.15rem] font-medium leading-[1.65] tracking-[-0.01em] text-white/95">
            {aiInsight === null ? (
              <p>{AI_INSIGHTS_FALLBACK_TEXT}</p>
            ) : aiInsight ? (
              aiInsight.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <>
                <p>
                  Trafiken ökar — men trafik som inte konverterar är bara en kostnad utan
                  avkastning. Det intressanta den här perioden är gapet som börjar öppna sig
                  mellan synlighet och affärseffekt.
                </p>
                <p>
                  Sjunkande engagemang i kombination med en svagare kontaktsida är ett klassiskt
                  mönster: ni når fler, men budskapet eller flödet håller inte besökaren kvar
                  tillräckligt länge för att ett beslut ska fattas. Det är inte ett trafikproblem —
                  det är ett konverteringsproblem som döljer sig bakom bra topplinjesiffror.
                </p>
                <p>
                  Nästa steg är inte mer trafik. Det är att förstå varför de som redan hittar er
                  väljer att lämna.
                </p>
              </>
            )}
          </div>
          <div className="flex items-start gap-3 border-t border-white/20 pt-4">
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-white"
              style={{ background: ACCENT }}
            >
              Bottom line
            </span>
            <p className="text-white font-semibold text-[1.05rem] leading-snug">
              {aiInsight === null
                ? AI_INSIGHTS_FALLBACK_TEXT
                : aiInsight?.bottom_line ??
                  "Synligheten förbättras. Men om engagemanget fortsätter sjunka och kontaktsidan inte återhämtar sig, riskerar ni att trafiktillväxten inte omvandlas till affärer."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideRecommendations({ aiInsights }: { aiInsights: AiInsightsPayload | null }) {
  const aiRecs = aiInsights?.slide_recs;
  const actions = [
    {
      tag: "Skala",
      icon: Zap,
      t: "Dubbla det som fungerar",
      b: "SEO-guiden drar 4 200 besök. Tre likvärdiga guider kan dubbla SEO-trafiken på ett kvartal.",
    },
    {
      tag: "Fixa",
      icon: Target,
      t: "Tät läckan vid kontakt",
      b: "Kontaktsidan tappar trafik. Tydligare CTA + kortare formulär kan återta förlorade leads.",
    },
    {
      tag: "Bygg",
      icon: PenSquare,
      t: "Bygg momentum",
      b: "Publicera 1 artikel i veckan. Konsekvensen har gett +14 % senaste perioden — håll tempot.",
    },
  ];
  return (
    <div className="space-y-7">
      <div>
        <SlideHeading sub="Tre fokusområden att prioritera den närmaste perioden.">
          Rekommenderade fokusområden
        </SlideHeading>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a, index) => {
          const Icon = a.icon;
          const body = aiRecs === null
            ? AI_INSIGHTS_FALLBACK_TEXT
            : aiRecs?.[index]?.body ?? a.b;
          return (
            <div
              key={a.t}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background/95 p-7 shadow-[0_4px_8px_rgba(15,23,42,0.03),0_18px_44px_-22px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #FF4D9E 0%, #FF6B55 50%, #FFB830 100%)" }}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground">
                  {a.tag}
                </span>
              </div>
              <h3 className="mt-6 font-display text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
                {a.t}
              </h3>
              <p className="mt-3 text-[21px] leading-relaxed text-foreground">
                {body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlideConversion({ d }: { d: SlideData }) {
  if (d.hasConversions) {
    return (
      <div className="space-y-7">
        <div>
          <SlideHeading sub="Senaste perioden — alla mätta konverteringar.">
            Affären bakom trafiken
          </SlideHeading>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { l: "Konverteringar", v: fmtNum(d.leads), dd: sign(d.leadsDelta) },
            { l: "Bästa kanal", v: "Google SEO", dd: "42 %" },
            { l: "Värde per lead", v: "—", dd: "" },
          ].map((m) => (
            <div
              key={m.l}
              className="rounded-3xl border border-border bg-background/85 p-6"
            >
              <p className="text-sm text-foreground">{m.l}</p>
              <p className="mt-2 font-display text-3xl tracking-tight">{m.v}</p>
              {m.dd && (
                <p className="mt-1 text-xs font-medium" style={{ color: TREND_POS }}>
                  {m.dd}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-full content-center gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <SlideHeading sub="Just nu mäter vi besök — men inte vad de leder till.">
          Du ser trafiken — men inte affären
        </SlideHeading>
        <p className="max-w-xl text-base leading-relaxed text-foreground sm:text-lg">
          Konverteringsspårning är inte aktiverat ännu. Med spårning på plats
          kan vi koppla varje besök till leads, samtal och köp — och visa exakt
          vilka kanaler som faktiskt driver affärer.
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: ACCENT }}
        >
          <Plug className="h-4 w-4" />
          Koppla på konverteringsspårning
        </button>
      </div>
      <div
        className="relative overflow-hidden rounded-3xl border border-white/20 p-8 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)] flex flex-col justify-center"
        style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-white/70 mb-5">
            Vad du får
          </p>
          <ul className="space-y-4">
            {[
              "Antal leads per kanal",
              "Värde per kanal i kronor",
              "Vilka sidor som faktiskt genererar affärer",
              "Bästa kampanj baserat på riktig data",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-white" />
                <span className="text-[22px] font-semibold text-white">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SlideAIVisibility() {
  const sources = [
    { n: "ChatGPT", state: "Ej spårat" },
    { n: "Perplexity", state: "Ej spårat" },
    { n: "Gemini", state: "Ej spårat" },
    { n: "Claude", state: "Ej spårat" },
  ];
  return (
    <div className="grid h-full content-center gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <SlideHeading sub="ChatGPT, Perplexity och Gemini skickar redan trafik — men syns inte i vanliga rapporter.">
          AI-synligheten är just nu okänd
        </SlideHeading>
        <ul className="space-y-2.5 text-base text-foreground sm:text-lg">
          {[
            "ChatGPT-trafik är inte spårad",
            "Perplexity-hänvisningar mäts inte",
            "Möjligheten i AI-sök är inte bevakad",
          ].map((txt) => (
            <li key={txt} className="flex items-start gap-3">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: ACCENT }}
              />
              {txt}
            </li>
          ))}
        </ul>
        <button
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: ACCENT }}
        >
          <Bot className="h-4 w-4" />
          Aktivera AI-synlighet
        </button>
      </div>
      <div
        className="relative overflow-hidden rounded-3xl border border-white/20 p-7 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)]"
        style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
            Status per AI-källa
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {sources.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur"
              >
                <p className="text-sm font-semibold text-white">{s.n}</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-white/80">
                  —
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
                  {s.state}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideRecap({
  d,
  aiInsights,
}: {
  d: SlideData;
  aiInsights: AiInsightsPayload | null;
}) {
  const aiRecap = aiInsights?.slide_recap;
  const bullets = [
    {
      t: "Trafiken växer",
      b: "Google fortsätter driva tillväxten — håll publiceringstempot.",
      positive: true,
    },
    {
      t: "Engagemanget behöver omsorg",
      b: "Besökstiden sjunker. Innehåll och layout är värt att se över.",
      positive: false,
    },
    {
      t: "AI-synligheten är omätt",
      b: "Aktivera spårning för att inte missa nästa söktrend.",
      positive: false,
    },
  ].map((bullet, index) => ({
    ...bullet,
    b: aiRecap === null
      ? AI_INSIGHTS_FALLBACK_TEXT
      : aiRecap?.[index]?.body ?? bullet.b,
  }));

  return (
    <div className="grid h-full content-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-6">
        <SlideHeading sub="Tre rader att ta med sig från perioden.">
          Tre saker att komma ihåg
        </SlideHeading>
        <ul className="space-y-4">
          {bullets.map((b) => (
            <li
              key={b.t}
              className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 p-4 sm:p-5"
            >
              <span
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: b.positive
                    ? TREND_POS_BG
                    : "oklch(0.94 0.04 60 / 0.6)",
                  color: b.positive ? TREND_POS : "oklch(0.55 0.14 60)",
                }}
              >
                {b.positive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <Compass className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="font-semibold">{b.t}</p>
                <p className="mt-1 text-[20px] text-foreground">{b.b}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="relative overflow-hidden flex flex-col justify-between gap-6 rounded-3xl border border-white/20 p-8 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)]"
        style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10 flex flex-col justify-between gap-6 flex-1">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white">
              Vill du ha hjälp att gå från insikt till handling?
            </p>
            <h2 className="mt-4 font-display text-4xl tracking-tight text-white sm:text-5xl">
              Boka en kort genomgång — vi går igenom rapporten tillsammans.
            </h2>
            <p className="mt-3 text-[20px] text-white">
              30 minuter. Inga säljpitcher. Bara konkreta nästa steg för din sida.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
              style={{ background: ACCENT }}
            >
              <Lightbulb className="h-4 w-4" />
              Boka strategigenomgång
            </button>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-5 py-3 text-sm font-semibold hover:bg-muted"
            >
              Se detaljerad rapport
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slide list ─────────────────────────────────────────────────────────── */

function buildSlides(
  d: SlideData,
  reportData: ReportData | null,
  aiInsights: AiInsightsPayload | null,
) {
  const insights = reportData ? deriveInsights(reportData) : [];
  const headline = deriveSlideHeadline(insights);
  return [
    { id: "hero", title: "Sammanfattning", render: () => <SlideHero d={d} headline={headline} aiInsights={aiInsights} /> },
    { id: "kpis", title: "Nyckeltal", render: () => <SlideKpis d={d} /> },
    { id: "trend", title: "Trafikutveckling", render: () => <SlideTrend d={d} /> },
    { id: "channels", title: "Trafikkällor", render: () => <SlideChannels d={d} /> },
    { id: "pages", title: "Bästa sidor", render: () => <SlidePages d={d} /> },
    { id: "insight", title: "Strategisk bedömning", render: () => <SlideStrategicInsight d={d} aiInsights={aiInsights} /> },
    { id: "recs", title: "Rekommendationer", render: () => <SlideRecommendations aiInsights={aiInsights} /> },
    { id: "conv", title: "Konvertering", render: () => <SlideConversion d={d} /> },
    { id: "ai", title: "AI-synlighet", render: () => <SlideAIVisibility /> },
    { id: "recap", title: "Kort summerat", render: () => <SlideRecap d={d} aiInsights={aiInsights} /> },
  ];
}

/* ─── Main viewer ────────────────────────────────────────────────────────── */

const CANVAS_W = 1280;
const CANVAS_H = 720;
const SLIDE_GAP = 120; // px between cards on the surface

function useCardScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);
  const [containerW, setContainerW] = useState(CANVAS_W);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = (w: number) => {
      const s = Math.min(w / CANVAS_W, 1.2) * 0.90;
      setScale(s);
      setContainerW(w);
    };
    const ro = new ResizeObserver(([entry]) => compute(entry.contentRect.width));
    ro.observe(el);
    compute(el.clientWidth);
    return () => ro.disconnect();
  }, [containerRef]);

  return { scale, containerW };
}

function SlideCard({ slide, scale, innerRef }: {
  slide: { id: string; render: () => React.ReactNode };
  scale: number;
  containerW: number;
  innerRef?: React.RefCallback<HTMLDivElement>;
}) {
  const prefersReduced = useReducedMotion();
  const cardH = CANVAS_H * scale;
  const cardW = CANVAS_W * scale;

  return (
    <motion.div
      ref={innerRef}
      initial={prefersReduced ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.55, ease: [0, 0, 0.2, 1] }}
      style={{ height: cardH, width: cardW, flexShrink: 0 }}
      className="relative mx-auto print:shadow-none print:rounded-none"
    >
      {/* Clipping shell — sized to scaled dimensions */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 2px 4px rgba(20,18,16,0.04), 0 12px 40px rgba(20,18,16,0.08)",
          border: "1px solid rgba(20,18,16,0.05)",
        }}
      >
        {/* Canvas — full 1280×720, scaled down to fit */}
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            fontSize: 20,
          }}
          className="flex h-full flex-col justify-center px-16 py-12"
        >
          {slide.render()}
        </div>
      </div>
    </motion.div>
  );
}

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSources, setNoSources] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { scale, containerW } = useCardScale(containerRef);
  const dateRange = useDateRange();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNoSources(false);
      setReportData(null);
      setAiInsights(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"])
        .neq("property_id", "_pending");

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setNoSources(true);
        setLoading(false);
        return;
      }

      const sources = data.filter(
        (s): s is ConnectedSource => s.source === "ga4" || s.source === "gsc",
      );

      if (sources.length === 0) {
        setNoSources(true);
        setLoading(false);
        return;
      }

      const parts = await Promise.all(
        sources.map(async (source) => {
          try {
            const endpoint = source.source === "ga4" ? "/api/ga4" : "/api/gsc";
            const body = source.source === "ga4"
              ? { propertyId: source.property_id, dateRange, locale: "sv" }
              : { siteUrl: source.property_id, dateRange, locale: "sv" };
            const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) return undefined;
            return (await res.json()) as Partial<ReportData>;
          } catch { return undefined; }
        }),
      );

      if (cancelled) return;

      const realParts = parts.filter((p): p is Partial<ReportData> => p !== undefined);
      if (realParts.length === 0) {
        setNoSources(true);
        setLoading(false);
        return;
      }

      const connectedIds = sources.map((s) => s.source) as ConnectableSource[];
      const base = realParts[0] as ReportData;
      const merged = realParts.length > 1
        ? mergeReportData(base, realParts.slice(1), connectedIds)
        : { ...base, meta: { ...base.meta, availableSources: connectedIds } };
      if (!merged.executiveSummary) merged.executiveSummary = deriveExecutiveSummary(merged, "sv");

      const metricsHash = hashAiInsightMetrics(merged);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let cached: { insights: unknown; metrics_hash: string; generated_at: string } | null = null;

      if (user) {
        const { data } = await supabase
          .from("ai_report_cache")
          .select("insights, metrics_hash, generated_at")
          .eq("user_id", user.id)
          .eq("period_start", dateRange.startDate)
          .eq("period_end", dateRange.endDate)
          .maybeSingle();
        cached = data;
      }

      if (!cancelled && isFreshAiInsightsCache(cached, metricsHash)) {
        const parsed = AiInsightsPayloadSchema.safeParse(cached?.insights);
        setAiInsights(parsed.success ? parsed.data : null);
      }

      setReportData(merged);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [dateRange.startDate, dateRange.endDate]);

  const slideData = useMemo(() => buildSlideData(reportData), [reportData]);
  const slides = useMemo(
    () => buildSlides(slideData, reportData, aiInsights),
    [slideData, reportData, aiInsights],
  );
  const total = slides.length;
  const cardH = CANVAS_H * scale;

  // Track which slide is in view via IntersectionObserver
  useEffect(() => {
    const els = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Pick the one closest to center
        const center = window.innerHeight / 2;
        let best = visible[0];
        let bestDist = Infinity;
        for (const e of visible) {
          const rect = e.boundingClientRect;
          const mid = rect.top + rect.height / 2;
          const dist = Math.abs(mid - center);
          if (dist < bestDist) { bestDist = dist; best = e; }
        }
        const idx = els.indexOf(best.target as HTMLDivElement);
        if (idx !== -1) setActiveIndex(idx);
      },
      { threshold: 0.5 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slides]);

  // Scroll to a card by index
  const scrollToIndex = useCallback((i: number) => {
    const el = cardRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Arrow keys / space scroll one card
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, total - 1));
      } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else window.history.back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, total, scrollToIndex]);

  // Fullscreen
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePresent = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  // Date preset picker — sets ?from=&to= on URL
  const applyPreset = (id: DatePresetId) => {
    const r = presetToRange(id);
    router.push(`?from=${r.startDate}&to=${r.endDate}`);
    setShowDatePicker(false);
  };

  const currentLabel = DATE_PRESETS.find((p) => {
    const r = presetToRange(p.id);
    return r.startDate === dateRange.startDate && r.endDate === dateRange.endDate;
  })?.labelSv ?? `${dateRange.startDate} – ${dateRange.endDate}`;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[oklch(0.965_0.005_270)] text-foreground print:bg-white" style={{ overscrollBehavior: "auto" }}>

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="print:hidden shrink-0 z-20 flex h-12 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Avsluta
          </Link>
          <span className="tabular-nums text-xs text-foreground/50">{activeIndex + 1} / {total}</span>
        </div>

        {/* Date picker */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            {currentLabel}
            <ArrowRight className="h-3 w-3 rotate-90" />
          </button>
          {showDatePicker && (
            <div
              className="absolute top-full right-0 mt-2 w-48 rounded-2xl border border-border/60 bg-background shadow-xl overflow-hidden z-50"
              onMouseLeave={() => setShowDatePicker(false)}
            >
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors font-medium"
                  style={{ color: p.id === (DATE_PRESETS.find(x => presetToRange(x.id).startDate === dateRange.startDate)?.id) ? "#FF6B55" : undefined }}
                >
                  {p.labelSv}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={togglePresent}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          {isFs ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {isFs ? "Avsluta" : "Present"}
        </button>
      </header>

      {/* ── Scroll surface ───────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none", overscrollBehaviorY: "auto" }}
      >
        <div ref={containerRef} className="mx-auto w-full max-w-[1400px] px-8">

          {/* No sources state */}
          {!loading && noSources && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-center">
              <p className="text-2xl font-display font-bold">Ingen data för den här perioden<span style={{ color: "#FF6B55" }}>.</span></p>
              <p className="text-sm text-foreground/60 max-w-sm">Koppla ihop Google Analytics eller Search Console under Integrationer för att se din rapport.</p>
              <Link href="/integrations" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "#FF6B55" }}>
                Gå till Integrationer
              </Link>
            </div>
          )}

          <div
            className="flex flex-col items-center"
            style={{ gap: SLIDE_GAP, paddingTop: SLIDE_GAP, paddingBottom: SLIDE_GAP }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: CANVAS_H * scale,
                      width: CANVAS_W * scale,
                      borderRadius: 6,
                      overflow: "hidden",
                      background: "#ffffff",
                      boxShadow: "0 2px 4px rgba(20,18,16,0.04), 0 12px 40px rgba(20,18,16,0.08)",
                      border: "1px solid rgba(20,18,16,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: CANVAS_W,
                        height: CANVAS_H,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        padding: "48px 64px",
                      }}
                    >
                      <SlideShimmer />
                    </div>
                  </div>
                ))
              : !noSources && slides.map((slide, i) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    scale={scale}
                    containerW={containerW}
                    innerRef={(el) => { cardRefs.current[i] = el; }}
                  />
                ))
            }
          </div>
        </div>

        {/* Dot nav — fixed right edge */}
        <div className="print:hidden fixed right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-[7px] z-20">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollToIndex(i)}
              aria-label={s.title}
              className="rounded-full transition-all duration-300"
              style={{
                width: 5,
                height: i === activeIndex ? 22 : 5,
                background: i === activeIndex
                  ? "oklch(0.35 0.01 270 / 0.7)"
                  : "oklch(0.5 0.01 270 / 0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom controls ──────────────────────────────────── */}
      <div className="print:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full px-4 py-2.5 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.7)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <button
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/6 disabled:opacity-25 transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/40">
          <kbd className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 font-mono text-[10px]">↑</kbd>
          <kbd className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 font-mono text-[10px]">↓</kbd>
        </div>
        <span className="text-xs font-medium tabular-nums text-foreground/50">{activeIndex + 1} / {total}</span>
        <button
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex === total - 1}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/6 disabled:opacity-25 transition-all"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
