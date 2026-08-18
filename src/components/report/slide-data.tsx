import {
  AtSign,
  Camera,
  Ghost,
  Globe,
  Link2,
  Mail,
  Megaphone,
  MousePointerClick,
  Music2,
  PlaySquare,
  Search as SearchIcon,
  ThumbsUp,
} from "lucide-react";
import type { ReportData } from "@/types/schema";

// Below this many sessions, a percent-change trend is mostly noise (e.g. 1→14
// visits reads as "+1300%" but is not a real signal) — same minimum-volume
// guard used for conversionRate deltas in derive-insights.ts.
const MIN_PAGE_TREND_SESSIONS = 10;

// SlideChannels has a layout per channel count (1–6) sized to the fixed slide
// canvas. Six is the ceiling: past that the long tail rolls into one row.
export const MAX_CHANNELS = 6;

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
    subChannels?: {
      /** Canonical network key from the mapper — stable React key. */
      source: string;
      name: string;
      icon: React.ElementType;
      pct: number;
      visits: number;
      delta: number | null;
    }[];
  }[];
  topPages: { p: string; title: string | null; v: number; d: number | null; trend: "up" | "down" | "flat" | null }[];
  timeSeries: { date: string; sessions: number }[];
  hasConversions: boolean;
  clientDomain: string | null;
  clientName: string | null;
}

const channelIcons: Record<string, React.ElementType> = {
  organic: SearchIcon, "Organic Search": SearchIcon, "organic search": SearchIcon, "Organisk sökning": SearchIcon, "organisk sökning": SearchIcon,
  paid: Globe, "Paid Search": Globe, "paid search": Globe, "Betald sökning": Globe, "betald sökning": Globe,
  social: Megaphone, "Organic Social": Megaphone, "organic social": Megaphone, "Organisk social": Megaphone, "Sociala medier": Megaphone,
  "Paid Social": Megaphone, "paid social": Megaphone, "Betald social": Megaphone, "betald social": Megaphone,
  direct: MousePointerClick, "Direct": MousePointerClick, "Direkt": MousePointerClick, "direkt": MousePointerClick,
  referral: Globe, "Referral": Globe, "Hänvisningar": Globe,
  email: Mail, "Email": Mail, "E-post": Mail,
};

// Keyed on the canonical source the mapper emits (normalizeSource in
// ga4-mapper.ts already collapses "m.facebook.com"/"fb"/"Facebook" → "facebook"),
// so one network is exactly one entry here. Placeholder lucide icons — swapping
// in real brand logos means editing only subChannelIcons.
const subChannelIcons: Record<string, React.ElementType> = {
  facebook: ThumbsUp,
  instagram: Camera,
  linkedin: Link2,
  tiktok: Music2,
  snapchat: Ghost,
  pinterest: Camera,
  x: AtSign,
  youtube: PlaySquare,
  reddit: Globe,
  other: Globe,
};

const subChannelNames: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  x: "X",
  youtube: "YouTube",
  reddit: "Reddit",
  other: "Övriga nätverk",
  "(not set)": "Okänd källa",
  "(other)": "Övriga nätverk",
};

const ORGANIC = { name: "Google (obetalt)", sub: "Besök från Googles vanliga sökresultat", tip: { title: "Vad är obetald söktrafik?", body: "Personer som hittade er via Googles vanliga sökresultat — utan att ni betalat för klicket.", example: "Ni rankar högt på 'redovisningsbyrå Stockholm' → någon klickar → ett organiskt besök." } };
const PAID    = { name: "Google Ads", sub: "Köpt trafik från Google", tip: { title: "Vad är Google Ads-trafik?", body: "Besökare som kom via en betald annons i Google Sök eller Display-nätverket.", example: "Ni betalar per klick. Stoppar ni budgeten → slutar trafiken direkt." } };
const SOCIAL  = { name: "Sociala medier", sub: "Besök från inlägg och delningar i sociala medier", tip: { title: "Vad är social trafik?", body: "Besökare som klickat in från sociala plattformar som LinkedIn, Facebook eller Instagram.", example: "Ett LinkedIn-inlägg som delas vidare kan ge en pik av social trafik." } };
const PAID_SOCIAL = { name: "Betald social", sub: "Köpt trafik från sociala medier", tip: { title: "Vad är betald social trafik?", body: "Besökare som kom via en betald annons på plattformar som Facebook, Instagram, LinkedIn eller TikTok.", example: "Ni kör en Facebook-annonskampanj → klick från annonsen räknas hit." } };
const DIRECT  = { name: "Direkttrafik", sub: "Besökare som skrev in adressen direkt", tip: { title: "Vad är direkttrafik?", body: "Besökare som redan känner till er och skrev in adressen direkt, eller kom via ett bokmärke.", example: "Befintliga kunder och varumärkeskännare dyker upp här." } };
const REFERRAL = { name: "Referral", sub: "Länkar från andra sajter", tip: { title: "Vad är referraltrafik?", body: "Besökare som kom via en länk på en annan webbplats — t.ex. en partner, artikel eller katalog.", example: "En omnämning i en branschblogg kan ge hög-kvalitativa referralbesök." } };
const EMAIL   = { name: "E-post", sub: "Nyhetsbrev & utskick", tip: { title: "Vad är e-posttrafik?", body: "Besökare som klickat via ett nyhetsbrev eller e-postutskick med UTM-spårning.", example: "Skickar ni ett månadsbrev med spårade länkar syns klicken här." } };
const UNKNOWN = { name: "Okänd trafik", sub: "Trafik som inte kunnat kopplas till en källa", tip: { title: "Vad är okänd trafik?", body: "Trafik där systemet inte kunnat avgöra varifrån besökaren kom — ofta p.g.a. saknade spårparametrar.", example: "Klick från appar, direktmeddelanden eller skyddade webbläsare hamnar ofta här." } };

const channelNames: Record<string, { name: string; sub: string; tip: { title: string; body: string; example?: string } }> = {
  "organic": ORGANIC, "Organic Search": ORGANIC, "organic search": ORGANIC,
  "paid": PAID, "Paid Search": PAID, "paid search": PAID,
  "social": SOCIAL, "Organic Social": SOCIAL, "organic social": SOCIAL, "Social": SOCIAL,
  "Paid Social": PAID_SOCIAL, "paid social": PAID_SOCIAL, "Betald social": PAID_SOCIAL, "betald social": PAID_SOCIAL,
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

  // Sort by visits so "top channels" really are the biggest, regardless of GA4 order.
  const sorted = [...rawChannels].sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0));

  // A channel carrying a sub-channel breakdown (paid social) keeps its own row
  // even when it is not top-N by volume. Without this it lands in the "Övriga
  // kanaler" rollup — which drops subChannels — and the drill-down silently
  // vanishes on the many sites where paid social is a small share of traffic.
  const hasSubChannels = (c: (typeof sorted)[number]) => !!c.subChannels?.length;
  const needsRollup = sorted.length > MAX_CHANNELS;
  const headRoom = needsRollup ? MAX_CHANNELS - 1 : MAX_CHANNELS;

  const pinned = sorted.filter(hasSubChannels).slice(0, headRoom);
  const head = [
    ...pinned,
    ...sorted.filter((c) => !pinned.includes(c)).slice(0, headRoom - pinned.length),
  ].sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0));
  const tail = sorted.filter((c) => !head.includes(c));

  const topChannels = head.map((c, i) => {
    const prev = c.previousSessions ?? 0;
    const curr = c.sessions ?? 0;
    const delta = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;
    const subChannels = c.subChannels?.map((sub) => {
      const subPrev = sub.previousSessions ?? 0;
      const subCurr = sub.sessions ?? 0;
      return {
        source: sub.source,
        name: subChannelNames[sub.source] ?? sub.source,
        icon: subChannelIcons[sub.source] ?? Globe,
        // share is already the network's cut of paid social, computed where the
        // sessions were summed — don't recompute it from a different base here.
        pct: Math.round(sub.share),
        visits: subCurr,
        delta: subPrev > 0 ? Math.round(((subCurr - subPrev) / subPrev) * 100) : null,
      };
    });
    return {
      name: channelNames[c.channel]?.name ?? c.channel,
      sub: channelNames[c.channel]?.sub ?? "",
      tip: channelNames[c.channel]?.tip ?? { title: c.channel, body: "" },
      pct: totalVisits > 0 ? Math.round((curr / totalVisits) * 100) : 0,
      visits: curr,
      delta,
      icon: channelIcons[c.channel] ?? Globe,
      featured: i === 0,
      subChannels,
    };
  });

  // Roll the long tail into one honest "Övriga kanaler" card so the page stays clean
  // but the numbers still sum to 100% — nothing is silently dropped.
  if (tail.length > 0) {
    const tailVisits = tail.reduce((s, c) => s + (c.sessions ?? 0), 0);
    const tailPrev = tail.reduce((s, c) => s + (c.previousSessions ?? 0), 0);
    const tailDelta =
      tailPrev > 0 ? Math.round(((tailVisits - tailPrev) / tailPrev) * 100) : null;
    if (tailVisits > 0) {
      topChannels.push({
        name: "Övriga kanaler",
        sub: `${tail.length} mindre källor sammanslagna`,
        tip: {
          title: "Vad är övriga kanaler?",
          body: "De mindre trafikkällorna sammanslagna till en rad — var och en står för en liten andel av besöken.",
          example: "Enskilda kanaler under några procent samlas här så rapporten håller fokus på det som driver mest trafik.",
        },
        pct: totalVisits > 0 ? Math.round((tailVisits / totalVisits) * 100) : 0,
        visits: tailVisits,
        delta: tailDelta,
        icon: Globe,
        featured: false,
        subChannels: undefined,
      });
    }
  }

  const rawSeries = traffic?.timeSeries ?? [];
  const timeSeries = rawSeries.map((p) => ({ date: p.date, sessions: p.value }));

  const rawPages = reportData?.topPages?.pages ?? [];
  const topPages = rawPages.slice(0, 6).map((p) => {
    const prev = p.previousSessions;
    const sessions = p.sessions ?? p.clicks ?? 0;
    const hasEnoughVolume =
      prev != null && prev >= MIN_PAGE_TREND_SESSIONS && sessions >= MIN_PAGE_TREND_SESSIONS;
    const d = hasEnoughVolume
      ? Math.round(((sessions - prev) / prev) * 100)
      : null;
    const trend = hasEnoughVolume ? p.trend ?? null : null;
    return { p: p.url, title: p.title ?? null, v: sessions, d, trend };
  });

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
    clientDomain: reportData?.meta?.clientDomain ?? null,
    clientName: reportData?.meta?.clientName ?? null,
  };
}
