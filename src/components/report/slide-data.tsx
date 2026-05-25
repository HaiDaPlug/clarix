import {
  Globe,
  Mail,
  Megaphone,
  MousePointerClick,
  Search as SearchIcon,
} from "lucide-react";
import type { ReportData } from "@/types/schema";

export interface SlideData {
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
  "organic": ORGANIC, "Organic Search": ORGANIC, "organic search": ORGANIC,
  "paid": PAID, "Paid Search": PAID, "paid search": PAID,
  "social": SOCIAL, "Organic Social": SOCIAL, "organic social": SOCIAL, "Social": SOCIAL,
  "direct": DIRECT, "Direct": DIRECT,
  "referral": REFERRAL, "Referral": REFERRAL,
  "email": EMAIL, "Email": EMAIL,
  "unassigned": UNKNOWN, "Unassigned": UNKNOWN, "(not set)": UNKNOWN,
  "Organisk sökning": ORGANIC, "organisk sökning": ORGANIC,
  "Betald sökning": PAID, "betald sökning": PAID,
  "Organisk social": SOCIAL, "organisk social": SOCIAL, "Sociala medier": SOCIAL,
  "Direkt": DIRECT, "direkt": DIRECT,
  "Hänvisningar": REFERRAL, "hänvisningar": REFERRAL,
  "E-post": EMAIL, "e-post": EMAIL,
  "Ej tilldelad": UNKNOWN, "ej tilldelad": UNKNOWN,
};

export function buildSlideData(reportData: ReportData | null): SlideData {
  const traffic = reportData?.trafficOverview;
  const kpi = reportData?.kpiSnapshot;
  const period = reportData?.meta?.period?.label ?? "Senaste perioden";

  const visits = traffic?.totalSessions?.value ?? 0;
  const prevVisits = traffic?.totalSessions?.previousValue ?? 0;
  const trafficDelta =
    prevVisits > 0
      ? Math.round(((visits - prevVisits) / prevVisits) * 100)
      : null;

  const organicVal = traffic?.organicSessions?.value;
  const people = organicVal ?? 0;
  const prevPeople = traffic?.organicSessions?.previousValue ?? 0;
  const peopleDelta =
    prevPeople > 0
      ? Math.round(((people - prevPeople) / prevPeople) * 100)
      : null;

  const bounceNow = traffic?.bounceRate?.value ?? null;
  const avgDuration = traffic?.avgSessionDuration?.value ?? null;
  const prevDuration = traffic?.avgSessionDuration?.previousValue ?? null;
  const timeDelta =
    avgDuration != null && prevDuration != null && prevDuration > 0
      ? Math.round(((avgDuration - prevDuration) / prevDuration) * 100)
      : null;

  const conv = reportData?.conversions;
  const leads = conv?.totalConversions?.value ?? 0;
  const prevLeads = conv?.totalConversions?.previousValue ?? 0;
  const leadsDelta =
    prevLeads > 0
      ? Math.round(((leads - prevLeads) / prevLeads) * 100)
      : null;

  const rawChannels = traffic?.channelBreakdown ?? [];
  const totalVisits =
    rawChannels.reduce((s, c) => s + (c.sessions ?? 0), 0) || visits;

  const topChannels = rawChannels.map((c, i) => {
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
