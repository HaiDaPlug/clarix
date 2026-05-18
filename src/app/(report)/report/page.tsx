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
  Minimize2,
  Megaphone,
  MousePointerClick,
  PenSquare,
  Plug,
  Search as SearchIcon,
  Sparkles,
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
import { createClient } from "@/utils/supabase/client";
import {
  ConnectableSource,
  ConnectedSource,
  currentCalendarMonthRange,
  mergeReportData,
} from "@/lib/google/connected-sources";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { localizeMockReportData, scenario2 } from "@/lib/mock-data";
import { deriveExecutiveSummary } from "@/lib/engine/derive-executive-summary";
import type { ReportData } from "@/types/schema";

/* ─── Design tokens ──────────────────────────────────────────────────────── */

const TREND_POS = "oklch(0.74 0.17 155)";
const TREND_NEG = "oklch(0.7 0.18 22)";
const TREND_POS_BG = "oklch(0.74 0.17 155 / 0.14)";
const TREND_NEG_BG = "oklch(0.7 0.18 22 / 0.14)";
const ACCENT = "oklch(0.5 0.18 290)";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fmtNum = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1).replace(".", ",") + " mn"
    : n >= 1_000
      ? (n / 1_000).toFixed(1).replace(".", ",") + " k"
      : n.toLocaleString("sv-SE");

const sign = (n: number) => (n >= 0 ? `+${n}%` : `−${Math.abs(n)}%`);

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function TrendPill({
  delta,
  positive,
  size = "md",
}: {
  delta: string;
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
    <p className="text-[13px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
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
      <h1 className="font-display text-[3.1rem] leading-[1.05] tracking-tight lg:text-[3.8rem]">
        {children}
      </h1>
      {sub ? (
        <p className="mt-3 text-[1.05rem] text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

function AISummary({
  children,
  label = "AI-sammanfattning",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/50 p-6 shadow-[0_24px_60px_-26px_rgba(99,102,241,0.45)] sm:p-8 dark:border-white/10"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.97 0.04 280) 0%, oklch(0.96 0.05 250) 55%, oklch(0.97 0.04 220) 100%)",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.55 0.2 290), oklch(0.6 0.18 250))",
          }}
        >
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[oklch(0.45_0.18_280)]">
            {label}
          </p>
          <div className="mt-2 space-y-3 text-[1.2rem] leading-[1.6] tracking-[-0.005em] text-[oklch(0.2_0.03_280)] sm:text-[1.3rem]">
            {children}
          </div>
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
  trafficDelta: number;
  people: number;
  peopleDelta: number;
  timeDelta: number;
  leads: number;
  leadsDelta: number;
  period: string;
  bounceRate: number | null;
  avgDuration: number | null;
  topChannels: {
    name: string;
    sub: string;
    info: string;
    pct: number;
    visits: number;
    delta: number;
    icon: React.ElementType;
    featured?: boolean;
  }[];
  topPages: { p: string; v: number; d: number }[];
  timeSeries: { date: string; sessions: number }[];
  hasConversions: boolean;
}

function buildSlideData(reportData: ReportData | null): SlideData {
  const traffic = reportData?.trafficOverview;
  const kpi = reportData?.kpiSnapshot;
  const period = reportData?.meta?.period?.label ?? "Senaste perioden";

  // Sessions / visits
  const visits = traffic?.totalSessions?.value ?? 18400;
  const prevVisits = traffic?.totalSessions?.previousValue ?? 16140;
  const trafficRaw =
    prevVisits > 0 ? ((visits - prevVisits) / prevVisits) * 100 : 0;
  const trafficDelta = Math.round(trafficRaw);

  // Users (use organicSessions as proxy when users not available)
  const organicVal = traffic?.organicSessions?.value;
  const people = organicVal != null ? organicVal : Math.round(visits * 0.72);
  const prevPeople =
    traffic?.organicSessions?.previousValue ?? Math.round(prevVisits * 0.72);
  const peopleDelta =
    prevPeople > 0
      ? Math.round(((people - prevPeople) / prevPeople) * 100)
      : 8;

  // Engagement / bounce
  const bounceNow = traffic?.bounceRate?.value ?? null;
  const bouncePrev = traffic?.bounceRate?.previousValue ?? null;
  const timeDelta =
    bounceNow != null && bouncePrev != null && bouncePrev > 0
      ? Math.round(((bounceNow - bouncePrev) / bouncePrev) * 100)
      : -6;
  const avgDuration = traffic?.avgSessionDuration?.value ?? null;

  // Leads / conversions
  const conv = reportData?.conversions;
  const leads = conv?.totalConversions?.value ?? 43;
  const prevLeads = conv?.totalConversions?.previousValue ?? 41;
  const leadsDelta =
    prevLeads > 0
      ? Math.round(((leads - prevLeads) / prevLeads) * 100)
      : 4;

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
  const ORGANIC = { name: "Google (Obetald söktrafik)", sub: "Besök från Googles vanliga sökresultat", info: "Det här är personer som hittade företaget via Google utan att man betalat för klicket." };
  const PAID    = { name: "Google Ads", sub: "Köpt trafik från Google", info: "Besökare som kom via en betald annons i Google Sök eller Display." };
  const SOCIAL  = { name: "Sociala medier", sub: "Besök från inlägg och delningar i sociala medier", info: "Det här är personer som klickat in från exempelvis LinkedIn, Facebook eller Instagram." };
  const DIRECT  = { name: "Direkttrafik", sub: "Besökare som gick direkt till hemsidan", info: "Det här är personer som redan känner till företaget och själva skrev in webbadressen eller använde ett bokmärke." };
  const REFERRAL = { name: "Referral", sub: "Länkar från andra sajter", info: "Besökare som kommit via en länk på en annan webbplats." };
  const EMAIL   = { name: "E-post", sub: "Nyhetsbrev & utskick", info: "Besökare som klickat via ett e-postutskick eller nyhetsbrev." };
  const UNKNOWN = { name: "Okänd källa", sub: "Trafik som inte kunnat kopplas tydligt till en källa", info: "Ibland saknas tillräcklig information för att systemet ska kunna avgöra exakt var trafiken kom ifrån." };

  const channelNames: Record<string, { name: string; sub: string; info: string }> = {
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

  const topChannels =
    rawChannels.length > 0
      ? rawChannels.slice(0, 6).map((c, i) => {
          const prev = c.previousSessions ?? 0;
          const curr = c.sessions ?? 0;
          const delta =
            prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
          return {
            name: channelNames[c.channel]?.name ?? c.channel,
            sub: channelNames[c.channel]?.sub ?? "",
            info: channelNames[c.channel]?.info ?? "",
            pct: Math.round((curr / totalVisits) * 100),
            visits: curr,
            delta,
            icon: channelIcons[c.channel] ?? Globe,
            featured: i === 0,
          };
        })
      : [
          { name: "Google (Obetald söktrafik)", sub: "Besök från Googles vanliga sökresultat", info: "Det här är personer som hittade företaget via Google utan att man betalat för klicket.", pct: 58, visits: 10672, delta: 14, icon: SearchIcon, featured: true },
          { name: "Direkttrafik", sub: "Besökare som gick direkt till hemsidan", info: "Det här är personer som redan känner till företaget och själva skrev in webbadressen eller använde ett bokmärke.", pct: 14, visits: 2576, delta: 3, icon: MousePointerClick },
          { name: "Sociala medier", sub: "Besök från inlägg och delningar i sociala medier", info: "Det här är personer som klickat in från exempelvis LinkedIn, Facebook eller Instagram.", pct: 11, visits: 2024, delta: -8, icon: Megaphone },
          { name: "Google Ads", sub: "Köpt trafik från Google", info: "Besökare som kom via en betald annons i Google Sök eller Display.", pct: 9, visits: 1656, delta: 6, icon: Globe },
          { name: "Referral", sub: "Länkar från andra sajter", info: "Besökare som kommit via en länk på en annan webbplats.", pct: 5, visits: 920, delta: 2, icon: Globe },
          { name: "E-post", sub: "Nyhetsbrev & utskick", info: "Besökare som klickat via ett e-postutskick eller nyhetsbrev.", pct: 3, visits: 552, delta: -1, icon: Mail },
        ];

  // Time series — TrafficOverview.timeSeries uses { date, value } (value = sessions)
  const rawSeries = traffic?.timeSeries ?? [];
  const timeSeries =
    rawSeries.length > 0
      ? rawSeries.map((p) => ({ date: p.date, sessions: p.value }))
      : [
          { date: "1 mar", sessions: 4200 },
          { date: "5 mar", sessions: 4680 },
          { date: "9 mar", sessions: 5120 },
          { date: "13 mar", sessions: 4980 },
          { date: "17 mar", sessions: 5640 },
          { date: "21 mar", sessions: 6210 },
          { date: "25 mar", sessions: 6780 },
          { date: "29 mar", sessions: 7240 },
        ];

  // Top pages — TopPages.pages[]
  const rawPages = reportData?.topPages?.pages ?? [];
  const topPages =
    rawPages.length > 0
      ? rawPages.slice(0, 6).map((p) => ({
          p: p.url,
          v: p.sessions ?? p.clicks ?? 0,
          d: 0, // no prior value in schema
        }))
      : [
          { p: "/seo-guide", v: 4200, d: 32 },
          { p: "/tjänster", v: 2900, d: 5 },
          { p: "/blogg/2025-trender", v: 1850, d: 18 },
          { p: "/produkter/aurora", v: 1540, d: 12 },
          { p: "/priser", v: 1320, d: 9 },
          { p: "/kontakt", v: 1200, d: -3 },
        ];

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

function SlideHero({ d }: { d: SlideData }) {
  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="space-y-4 text-center">
        <Eyebrow>Sammanfattning · {d.period}</Eyebrow>
        <div className="mx-auto max-w-5xl space-y-3">
          <h1 className="font-display text-[3.1rem] leading-[1.05] tracking-tight lg:text-[3.8rem] whitespace-nowrap">
            Din digitala synlighet går åt rätt håll
          </h1>
          <div className="flex items-center justify-center gap-3">
            <TrendPill
              delta={sign(d.trafficDelta)}
              positive={d.trafficDelta >= 0}
              size="lg"
            />
            <p className="text-[1.05rem] text-muted-foreground">En tydlig riktning — drivet av Google.</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5 pt-1">
          {[
            { l: `+${Math.abs(d.trafficDelta)}% trafik`, positive: d.trafficDelta >= 0 },
            { l: "Google starkaste kanal", positive: true },
            { l: "Kontaktsidan tappar trafik", positive: false },
          ].map((b) => (
            <span
              key={b.l}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-sm font-medium shadow-sm"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: b.positive ? TREND_POS : TREND_NEG }}
              />
              {b.l}
            </span>
          ))}
        </div>
      </div>
      <AISummary>
        <p>
          Den här perioden fick din hemsida {pos(fmtNum(d.visits))} besök —
          cirka {pos(fmtNum(Math.abs(d.visits - d.prevVisits)))} fler än förra
          månaden.
        </p>
        <p>
          Google var din starkaste trafikkälla och växte mest (
          {pos(sign(d.trafficDelta))}). Samtidigt tappade kontaktsidan trafik,
          vilket är viktigt eftersom leads ofta kommer därifrån.
        </p>
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
      p: d.trafficDelta >= 0,
      h: "Totalt antal sessioner under perioden — varje gång någon besöker sidan räknas det som ett besök, oavsett om de varit inne förut.",
    },
    {
      l: "Antal personer",
      v: fmtNum(d.people),
      d: sign(d.peopleDelta),
      p: d.peopleDelta >= 0,
      h: "Unika besökare — hur många olika personer som kom till sidan. En person kan göra flera besök men räknas bara en gång här.",
    },
    {
      l: "Tid på sidan",
      v: "2 min 14 s",
      d: sign(d.timeDelta),
      p: d.timeDelta >= 0,
      h: "Genomsnittlig tid per besök. Längre tid tyder på att besökarna hittar relevant innehåll och stannar kvar.",
    },
    {
      l: "Leads",
      v: fmtNum(d.leads),
      d: sign(d.leadsDelta),
      p: d.leadsDelta >= 0,
      h: "Antal registrerade konverteringar — t.ex. kontaktformulär, samtal eller köp. Kräver att konverteringsspårning är aktiverat.",
    },
  ];
  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Nyckeltal</Eyebrow>
        <div className="mt-3">
          <SlideHeading sub="Så ser perioden ut i siffror — jämfört med föregående månad.">
            Snabb överblick
          </SlideHeading>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {kpis.map((k) => (
          <div
            key={k.l}
            className="flex h-full min-h-[200px] flex-col rounded-3xl border border-border bg-background/85 p-6 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold sm:text-base">{k.l}</p>
                <InfoTooltip text={k.h} side="below" />
              </div>
              <TrendPill delta={k.d} positive={k.p} size="md" />
            </div>
            <p className="mt-auto pt-6 font-display text-[3.6rem] font-semibold leading-none tracking-tight tabular-nums">
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
  const rightStats: { label: string; value: string; delta?: number }[] = [
    ...topThree.map((c) => ({ label: c.name, value: c.visits.toLocaleString("sv-SE"), delta: c.delta })),
    ...(d.bounceRate != null ? [{ label: "Avvisningsfrekvens", value: `${d.bounceRate.toFixed(1)}%` }] : []),
    ...(d.avgDuration != null ? [{ label: "Genomsn. besökstid", value: `${Math.round(d.avgDuration)}s` }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Trafiköversikt</Eyebrow>
          <h1 className="mt-2 font-display text-[3.1rem] leading-[1.05] tracking-tight">
            Så hittar besökarna till er
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Föregående månad</p>
        </div>
        <TrendPill
          delta={sign(d.trafficDelta)}
          positive={d.trafficDelta >= 0}
          size="lg"
        />
      </div>

      {/* Chart + right stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px]">
        {/* Chart card */}
        <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
          {/* Totala sessioner inside the card, stacked */}
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Totala besök</p>
            <p className="mt-0.5 font-display text-[2.6rem] font-semibold leading-none tracking-tight tabular-nums">
              {d.visits.toLocaleString("sv-SE")}
            </p>
          </div>
          <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={d.timeSeries}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="r2-t-blue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={blue} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      if (isNaN(d.getTime())) return v;
                      return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value) => [typeof value === "number" ? value.toLocaleString("sv-SE") : value, "Sessioner"]}
                    labelFormatter={(v) => {
                      const d = new Date(v);
                      if (isNaN(d.getTime())) return v;
                      return d.toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" });
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke={blue}
                    strokeWidth={1.5}
                    fill="url(#r2-t-blue)"
                    dot={false}
                    activeDot={{ r: 3, fill: blue, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* Per kanal — right column */}
        {rightStats.length > 0 && (
          <div className="rounded-3xl border border-border/60 bg-background/70 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Per kanal
            </p>
            <div>
              {rightStats.map((s, i) => (
                <div key={s.label}>
                  <div className="py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      {s.label}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-2xl font-semibold leading-none tracking-tight tabular-nums">
                        {s.value}
                      </p>
                      {s.delta != null && s.delta !== 0 && (
                        <TrendPill
                          delta={sign(s.delta)}
                          positive={s.delta >= 0}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                  {i < rightStats.length - 1 && (
                    <div className="h-px bg-border/60" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Kanalfördelning — bottom bars */}
      {d.topChannels.length > 0 && (
        <div className="rounded-3xl border border-border/60 bg-background/70 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Kanalfördelning
          </p>
          <div className="flex gap-5">
            {d.topChannels.slice(0, 5).map((ch) => (
              <div key={ch.name} className="flex-1 min-w-0">
                <div className="flex items-end justify-between mb-1.5 gap-1">
                  <span className="truncate text-[11px] text-muted-foreground">{ch.name}</span>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums">{ch.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-border/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${ch.pct}%`, background: blue }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SlideChannels({ d }: { d: SlideData }) {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Trafikkällor</Eyebrow>
        <div className="mt-3">
          <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
            Dina bästa trafikkällor
          </SlideHeading>
        </div>
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground/70">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold leading-tight">{c.name}</p>
                    {c.info && <InfoTooltip text={c.info} side="below" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.sub}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-3xl font-semibold tabular-nums">{c.pct}%</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{fmtNum(c.visits)} besök</p>
                </div>
                <TrendPill delta={sign(c.delta)} positive={c.delta >= 0} size="sm" />
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
        <Eyebrow>Bästa sidor</Eyebrow>
        <div className="mt-3">
          <SlideHeading sub="Sidorna som drar mest besök just nu — och hur de utvecklas.">
            Dina viktigaste sidor
          </SlideHeading>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {d.topPages.map((row, i) => {
          const positive = row.d >= 0;
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
              <p className="mt-4 truncate font-display text-lg font-semibold tracking-tight">
                {row.p}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <p className="font-display text-2xl font-semibold tabular-nums">
                  {fmtNum(row.v)}
                </p>
                <span className="text-sm font-medium text-muted-foreground">besök</span>
                <InfoTooltip text="Antal gånger den här sidan laddades under perioden. En besökare kan bidra med flera besök om de återkommer." side="above" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlideStrategicInsight({ d }: { d: SlideData }) {
  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="space-y-3 text-center">
        <Eyebrow>Strategisk bedömning</Eyebrow>
        <div className="mx-auto max-w-3xl">
          <SlideHeading sub="Vad siffrorna betyder för affären — inte bara dashboarden.">
            Synligheten växer — men värdet fångas inte fullt ut
          </SlideHeading>
        </div>
      </div>
      <AISummary label="Clarix executive insight">
        <p>
          Google är fortsatt din starkaste tillväxtmotor och driver merparten av
          trafikökningen den här perioden.
        </p>
        <p>
          Samtidigt har engagemanget gått ned, vilket tyder på att besökare hittar
          dig — men inte stannar lika länge. Kontaktsidan tappade också synlighet,
          vilket är viktigt eftersom det är där leads ofta konverterar.
        </p>
        <div className="flex items-center gap-3 border-t border-[oklch(0.5_0.18_290_/_0.18)] pt-3">
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-widest text-white"
            style={{ background: ACCENT }}
          >
            Bottom line
          </span>
          <p className="font-semibold">
            Synligheten förbättras, men affärsvärdet fångas inte fullt ut ännu.
          </p>
        </div>
      </AISummary>
    </div>
  );
}

function SlideRecommendations() {
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
        <Eyebrow>Våra rekommendationer</Eyebrow>
        <div className="mt-3">
          <SlideHeading sub="Tre fokusområden att prioritera den närmaste perioden.">
            Rekommenderade fokusområden
          </SlideHeading>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.t}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background/95 p-7 shadow-[0_4px_8px_rgba(15,23,42,0.03),0_18px_44px_-22px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground/75">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  {a.tag}
                </span>
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                {a.t}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-foreground/75">
                {a.b}
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
          <Eyebrow>Konverteringar</Eyebrow>
          <div className="mt-3">
            <SlideHeading sub="Senaste perioden — alla mätta konverteringar.">
              Affären bakom trafiken
            </SlideHeading>
          </div>
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
              <p className="text-sm text-muted-foreground">{m.l}</p>
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
        <Eyebrow>Möjlighet</Eyebrow>
        <SlideHeading sub="Just nu mäter vi besök — men inte vad de leder till.">
          Du ser trafiken — men inte affären
        </SlideHeading>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
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
      <AISummary label="Vad du får">
        <ul className="space-y-3">
          {[
            "Antal leads per kanal",
            "Värde per kanal i kronor",
            "Vilka sidor som faktiskt genererar affärer",
            "Bästa kampanj baserat på riktig data",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: TREND_POS }}
              />
              <span className="text-base">{t}</span>
            </li>
          ))}
        </ul>
      </AISummary>
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
        <Eyebrow>AI-synlighet</Eyebrow>
        <SlideHeading sub="ChatGPT, Perplexity och Gemini skickar redan trafik — men syns inte i vanliga rapporter.">
          AI-synligheten är just nu okänd
        </SlideHeading>
        <ul className="space-y-2.5 text-base text-muted-foreground sm:text-lg">
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
        className="relative overflow-hidden rounded-3xl border border-white/50 p-7 shadow-[0_24px_60px_-26px_rgba(99,102,241,0.4)]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.96 0.06 290) 0%, oklch(0.97 0.04 245) 100%)",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[oklch(0.45_0.18_280)]">
          Status per AI-källa
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {sources.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur"
            >
              <p className="text-sm font-semibold">{s.n}</p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-muted-foreground">
                —
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[oklch(0.5_0.18_290)]">
                {s.state}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideRecap({ d }: { d: SlideData }) {
  return (
    <div className="grid h-full content-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-6">
        <Eyebrow>Kort summerat</Eyebrow>
        <SlideHeading sub="Tre rader att ta med sig från perioden.">
          Tre saker att komma ihåg
        </SlideHeading>
        <ul className="space-y-4">
          {[
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
          ].map((b) => (
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
                <p className="mt-1 text-sm text-muted-foreground">{b.b}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="flex flex-col justify-between gap-6 rounded-3xl border border-white/50 p-8 shadow-[0_24px_60px_-26px_rgba(99,102,241,0.4)]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.97 0.04 280) 0%, oklch(0.96 0.05 250) 55%, oklch(0.97 0.04 220) 100%)",
        }}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[oklch(0.45_0.18_280)]">
            Vill du ha hjälp att gå från insikt till handling?
          </p>
          <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            Boka en kort genomgång — vi går igenom rapporten tillsammans.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
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
  );
}

/* ─── Slide list ─────────────────────────────────────────────────────────── */

function buildSlides(d: SlideData) {
  return [
    { id: "hero", title: "Sammanfattning", render: () => <SlideHero d={d} /> },
    { id: "kpis", title: "Nyckeltal", render: () => <SlideKpis d={d} /> },
    { id: "trend", title: "Trafikutveckling", render: () => <SlideTrend d={d} /> },
    { id: "channels", title: "Trafikkällor", render: () => <SlideChannels d={d} /> },
    { id: "pages", title: "Bästa sidor", render: () => <SlidePages d={d} /> },
    { id: "insight", title: "Strategisk bedömning", render: () => <SlideStrategicInsight d={d} /> },
    { id: "recs", title: "Rekommendationer", render: () => <SlideRecommendations /> },
    { id: "conv", title: "Konvertering", render: () => <SlideConversion d={d} /> },
    { id: "ai", title: "AI-synlighet", render: () => <SlideAIVisibility /> },
    { id: "recap", title: "Kort summerat", render: () => <SlideRecap d={d} /> },
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { scale, containerW } = useCardScale(containerRef);

  // Load real data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fallback = localizeMockReportData(scenario2, "sv");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("connected_sources")
        .select("id, source, property_id, display_name, token_expires_at")
        .in("source", ["ga4", "gsc"])
        .neq("property_id", "_pending");

      if (cancelled || error) { if (!cancelled) setReportData(fallback); return; }

      const sources = (data ?? []).filter(
        (s): s is ConnectedSource => s.source === "ga4" || s.source === "gsc",
      );
      if (sources.length === 0) { setReportData(fallback); return; }

      const dateRange = currentCalendarMonthRange();
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
      const connectedIds = sources.map((s) => s.source) as ConnectableSource[];
      const merged = mergeReportData(fallback, parts, connectedIds);
      if (!merged.executiveSummary) merged.executiveSummary = deriveExecutiveSummary(merged, "sv");
      setReportData(merged);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const slideData = useMemo(() => buildSlideData(reportData), [reportData]);
  const slides = useMemo(() => buildSlides(slideData), [slideData]);
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

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[oklch(0.965_0.005_270)] text-foreground print:bg-white">

      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="print:hidden shrink-0 z-20 flex h-10 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Avsluta
          </Link>
          <span className="tabular-nums text-xs text-muted-foreground/70">{activeIndex + 1} / {total}</span>
        </div>
        <button
          onClick={togglePresent}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          {isFs ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {isFs ? "Avsluta" : "Present"}
        </button>
      </header>

      {/* ── Scroll surface ───────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <div ref={containerRef} className="mx-auto w-full max-w-[1400px] px-8">
          <div
            className="flex flex-col items-center"
            style={{ gap: SLIDE_GAP, paddingTop: SLIDE_GAP, paddingBottom: SLIDE_GAP * 4 }}
          >
            {slides.map((slide, i) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                scale={scale}
                containerW={containerW}
                innerRef={(el) => { cardRefs.current[i] = el; }}
              />
            ))}
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
