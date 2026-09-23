/* ────────────────────────────────────────────────────────────────────────────
 * THROWAWAY — visual test fixtures for SlideChannels.
 *
 * Delete this file together with src/app/report-lab/ and e2e/report-lab.spec.ts
 * once the channel layouts have been signed off. Nothing in the shipping app
 * imports it; it exists so every layout (1–6 channels) and every paid-social
 * shape can be seen in a browser without waiting for a live GA4 property that
 * happens to have that exact mix.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { ReportData } from "@/types/schema";

type SubSpec = { source: string; sessions: number; previousSessions?: number };
type ChannelSpec = {
  channel: string;
  sessions: number;
  previousSessions?: number;
  subs?: SubSpec[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function buildChannels(specs: ChannelSpec[]): NonNullable<
  NonNullable<ReportData["trafficOverview"]>["channelBreakdown"]
> {
  const total = specs.reduce((sum, c) => sum + c.sessions, 0);

  return specs.map((c) => {
    const subTotal = (c.subs ?? []).reduce((sum, s) => sum + s.sessions, 0);
    return {
      channel: c.channel,
      sessions: c.sessions,
      previousSessions: c.previousSessions,
      share: total ? round1((c.sessions / total) * 100) : 0,
      subChannels: c.subs?.map((s) => ({
        source: s.source,
        sessions: s.sessions,
        previousSessions: s.previousSessions,
        share: subTotal ? round1((s.sessions / subTotal) * 100) : 0,
      })),
    };
  });
}

function makeReport(id: string, specs: ChannelSpec[]): ReportData {
  const channelBreakdown = buildChannels(specs);
  const sessions = specs.reduce((sum, c) => sum + c.sessions, 0);
  const previous = specs.reduce((sum, c) => sum + (c.previousSessions ?? c.sessions), 0);

  return {
    meta: {
      id,
      clientName: "Lab AB",
      clientDomain: "lab.se",
      agencyName: "Khyte",
      reportType: "traffic",
      cadence: "monthly",
      period: {
        label: "Mars 2026",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      },
      availableSources: ["ga4"],
      generatedAt: "2026-03-31T12:00:00.000Z",
    },
    trafficOverview: {
      totalSessions: {
        label: "Totala sessioner",
        value: sessions,
        previousValue: previous,
        unit: "number",
      },
      organicSessions: {
        label: "Organisk trafik",
        value: specs[0]?.sessions ?? 0,
        previousValue: specs[0]?.previousSessions,
        unit: "number",
      },
      bounceRate: { label: "Avvisningsfrekvens", value: 44.8, previousValue: 46.1, unit: "percent" },
      avgSessionDuration: {
        label: "Genomsnittlig sessionslängd",
        value: 138,
        previousValue: 132,
        unit: "seconds",
      },
      timeSeries: [],
      channelBreakdown,
    },
  };
}

/* ── network mixes ─────────────────────────────────────────────────────────── */

const FOUR_NETWORKS: SubSpec[] = [
  { source: "facebook", sessions: 340, previousSessions: 260 },
  { source: "instagram", sessions: 210, previousSessions: 150 },
  { source: "linkedin", sessions: 96, previousSessions: 110 },
  { source: "tiktok", sessions: 74, previousSessions: 40 },
];

const ONE_NETWORK: SubSpec[] = [{ source: "facebook", sessions: 720, previousSessions: 560 }];

// Five rows: the mapper caps named networks at 4 and rolls the rest into `other`.
const WITH_ROLLUP: SubSpec[] = [
  { source: "facebook", sessions: 300, previousSessions: 240 },
  { source: "instagram", sessions: 180, previousSessions: 150 },
  { source: "linkedin", sessions: 110, previousSessions: 90 },
  { source: "tiktok", sessions: 80, previousSessions: 55 },
  { source: "other", sessions: 50, previousSessions: 25 },
];

const ALL_DECLINING: SubSpec[] = [
  { source: "facebook", sessions: 240, previousSessions: 480 },
  { source: "instagram", sessions: 180, previousSessions: 260 },
  { source: "snapchat", sessions: 60, previousSessions: 140 },
];

// An unmapped source falls through to its raw key + Globe icon — worth seeing,
// since a client running ads on something exotic will hit exactly this.
const UNMAPPED: SubSpec[] = [
  { source: "facebook", sessions: 400, previousSessions: 330 },
  { source: "annonsplattform-nord.se", sessions: 220, previousSessions: 90 },
  { source: "(not set)", sessions: 100, previousSessions: 140 },
];

/* ── channel building blocks ───────────────────────────────────────────────── */

const ORGANIC: ChannelSpec = { channel: "Organisk sökning", sessions: 14_800, previousSessions: 15_260 };
const PAID_SEARCH: ChannelSpec = { channel: "Betald sökning", sessions: 9_400, previousSessions: 8_100 };
const DIRECT: ChannelSpec = { channel: "Direkt", sessions: 3_620, previousSessions: 3_480 };
const REFERRAL: ChannelSpec = { channel: "Hänvisningar", sessions: 1_540, previousSessions: 1_320 };
const EMAIL: ChannelSpec = { channel: "E-post", sessions: 780, previousSessions: 690 };
const ORGANIC_SOCIAL: ChannelSpec = { channel: "Organisk social", sessions: 560, previousSessions: 430 };

const paidSocial = (subs?: SubSpec[], sessions = 720, previousSessions = 560): ChannelSpec => ({
  channel: "Paid Social",
  sessions,
  previousSessions,
  subs,
});

export type LabCase = {
  id: string;
  group: "layout" | "paid-social";
  label: string;
  note: string;
  data: ReportData;
};

export const LAB_CASES: LabCase[] = [
  /* ── one layout per channel count ───────────────────────────────────────── */
  {
    id: "layout-1",
    group: "layout",
    label: "1 channel",
    note: "Hero. No bar — a lone channel is always 100%, so the number carries the slide.",
    data: makeReport("layout-1", [{ ...ORGANIC, sessions: 18_400 }]),
  },
  {
    id: "layout-1-subs",
    group: "layout",
    label: "1 channel, with networks",
    note: "Hero with the breakdown open by default — nothing to toggle against.",
    data: makeReport("layout-1-subs", [paidSocial(FOUR_NETWORKS, 18_400, 15_100)]),
  },
  {
    id: "layout-2",
    group: "layout",
    label: "2 channels",
    note: "Two tall cards. Expanding swaps the card body at fixed height.",
    data: makeReport("layout-2", [ORGANIC, paidSocial(FOUR_NETWORKS, 6_200, 4_900)]),
  },
  {
    id: "layout-3",
    group: "layout",
    label: "3 channels",
    note: "Bar rows — the only layout with room to grow downward on expand.",
    data: makeReport("layout-3", [ORGANIC, PAID_SEARCH, paidSocial(FOUR_NETWORKS, 3_100, 2_400)]),
  },
  {
    id: "layout-4",
    group: "layout",
    label: "4 channels",
    note: "Even 2×2.",
    data: makeReport("layout-4", [ORGANIC, PAID_SEARCH, DIRECT, paidSocial(FOUR_NETWORKS)]),
  },
  {
    id: "layout-5",
    group: "layout",
    label: "5 channels",
    note: "Feature column + 2×2. The lead channel takes full height.",
    data: makeReport("layout-5", [ORGANIC, PAID_SEARCH, DIRECT, REFERRAL, paidSocial(FOUR_NETWORKS)]),
  },
  {
    id: "layout-6",
    group: "layout",
    label: "6 channels",
    note: "Even 3×2 — the ceiling.",
    data: makeReport("layout-6", [
      ORGANIC, PAID_SEARCH, DIRECT, REFERRAL, EMAIL, paidSocial(FOUR_NETWORKS),
    ]),
  },
  {
    id: "layout-7-rollup",
    group: "layout",
    label: "8 channels → rollup + pin",
    note:
      "Eight in, six drawn. Paid Social is 7th by volume so it should still appear " +
      "(pinned), while E-post and Organisk social merge into Övriga kanaler.",
    data: makeReport("layout-7-rollup", [
      ORGANIC, PAID_SEARCH, DIRECT, REFERRAL, EMAIL, ORGANIC_SOCIAL,
      { channel: "Display", sessions: 640, previousSessions: 700 },
      paidSocial(FOUR_NETWORKS, 520, 410),
    ]),
  },

  /* ── paid-social shapes, all on the 4-channel layout ────────────────────── */
  {
    id: "ps-none",
    group: "paid-social",
    label: "No networks",
    note: "Paid Social with no subChannels — must not be clickable, no chevron.",
    data: makeReport("ps-none", [ORGANIC, PAID_SEARCH, DIRECT, paidSocial(undefined)]),
  },
  {
    id: "ps-one",
    group: "paid-social",
    label: "One network",
    note: "Single row — checks the breakdown doesn't look broken at n=1.",
    data: makeReport("ps-one", [ORGANIC, PAID_SEARCH, DIRECT, paidSocial(ONE_NETWORK)]),
  },
  {
    id: "ps-four",
    group: "paid-social",
    label: "Four networks",
    note: "The named-network cap.",
    data: makeReport("ps-four", [ORGANIC, PAID_SEARCH, DIRECT, paidSocial(FOUR_NETWORKS)]),
  },
  {
    id: "ps-rollup",
    group: "paid-social",
    label: "Five rows (with rollup)",
    note: "Densest breakdown: 4 named + Övriga nätverk. Shares must still sum to 100%.",
    data: makeReport("ps-rollup", [ORGANIC, PAID_SEARCH, DIRECT, paidSocial(WITH_ROLLUP)]),
  },
  {
    id: "ps-declining",
    group: "paid-social",
    label: "All declining",
    note: "Every network down — checks negative trend pills read clearly.",
    data: makeReport("ps-declining", [ORGANIC, PAID_SEARCH, DIRECT, paidSocial(ALL_DECLINING, 480, 880)]),
  },
  {
    id: "ps-unmapped",
    group: "paid-social",
    label: "Unmapped + (not set)",
    note: "Long raw source name and (not set) — checks truncation and icon fallback.",
    data: makeReport("ps-unmapped", [ORGANIC, PAID_SEARCH, DIRECT, paidSocial(UNMAPPED)]),
  },
];
