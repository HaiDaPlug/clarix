import { describe, it, expect } from "vitest";
import { mapGa4Report } from "./ga4-mapper";
import type { Ga4ResponseSet, Ga4RunReportResponse } from "./report-types";

function summaryResponse(sessions: number): Ga4RunReportResponse {
  return {
    dimensionHeaders: [],
    metricHeaders: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "bounceRate" },
      { name: "engagementRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
      { name: "sessionConversionRate" },
    ],
    rows: [
      {
        dimensionValues: [],
        metricValues: [
          { value: String(sessions) },
          { value: "0" },
          { value: "0" },
          { value: "0" },
          { value: "0" },
          { value: "0" },
          { value: "0" },
          { value: "0" },
        ],
      },
    ],
  };
}

function channelsResponse(
  rows: Array<{ channel: string; sessions: number }>,
): Ga4RunReportResponse {
  return {
    dimensionHeaders: [{ name: "sessionDefaultChannelGroup" }],
    metricHeaders: [{ name: "sessions" }],
    rows: rows.map((r) => ({
      dimensionValues: [{ value: r.channel }],
      metricValues: [{ value: String(r.sessions) }],
    })),
  };
}

function paidSocialResponse(
  rows: Array<{ source: string; sessions: number }>,
): Ga4RunReportResponse {
  return {
    dimensionHeaders: [{ name: "sessionSource" }],
    metricHeaders: [{ name: "sessions" }],
    rows: rows.map((r) => ({
      dimensionValues: [{ value: r.source }],
      metricValues: [{ value: String(r.sessions) }],
    })),
  };
}

function emptyReport(): Ga4RunReportResponse {
  return { rows: [] };
}

function responseSet(
  channels: Ga4RunReportResponse,
  sessions = 100,
  paidSocial: Ga4RunReportResponse = emptyReport(),
): Ga4ResponseSet {
  return {
    summary: summaryResponse(sessions),
    channels,
    paidSocial,
    timeSeries: emptyReport(),
    topPages: emptyReport(),
  };
}

const DATE_RANGE = { startDate: "2026-01-01", endDate: "2026-01-31" };

function run(current: Ga4ResponseSet, prior: Ga4ResponseSet) {
  return mapGa4Report({
    current,
    prior,
    dateRange: DATE_RANGE,
    priorDateRange: DATE_RANGE,
    locale: "en",
  });
}

function paidSocialRow(result: ReturnType<typeof run>) {
  return result.trafficOverview?.channelBreakdown?.find((c) => c.channel === "Paid Social");
}

describe("mapGa4Report channel breakdown", () => {
  it("keeps channel totals and shares independent of the paid-social request", () => {
    // A property with far more paid-social sources than the sub-channel cap.
    // Channel totals come from their own low-cardinality query, so the size of
    // this response must not move any top-level number.
    const manySources = Array.from({ length: 80 }, (_, i) => ({
      source: `network-${i}.com`,
      sessions: 100 - i,
    }));
    const channels = channelsResponse([
      { channel: "Organic Search", sessions: 500 },
      { channel: "Direct", sessions: 300 },
      { channel: "Paid Social", sessions: 200 },
    ]);

    const withSubChannels = run(
      responseSet(channels, 1000, paidSocialResponse(manySources)),
      responseSet(channelsResponse([]), 0),
    );
    const withoutSubChannels = run(
      responseSet(channels, 1000),
      responseSet(channelsResponse([]), 0),
    );

    const strip = (r: ReturnType<typeof run>) =>
      r.trafficOverview?.channelBreakdown?.map(({ channel, sessions, share }) => ({
        channel,
        sessions,
        share,
      }));

    expect(strip(withSubChannels)).toEqual(strip(withoutSubChannels));
    expect(strip(withSubChannels)).toEqual([
      { channel: "Organic Search", sessions: 500, share: 50 },
      { channel: "Direct", sessions: 300, share: 30 },
      { channel: "Paid Social", sessions: 200, share: 20 },
    ]);
    expect(withSubChannels.trafficOverview?.organicSessions?.value).toBe(500);
    expect(withSubChannels.trafficOverview?.directSessions?.value).toBe(300);
  });

  it("collapses source spelling variants of one network into a single row", () => {
    const result = run(
      responseSet(
        channelsResponse([{ channel: "Paid Social", sessions: 100 }]),
        100,
        paidSocialResponse([
          { source: "facebook", sessions: 40 },
          { source: "m.facebook.com", sessions: 20 },
          { source: "Facebook", sessions: 10 },
          { source: "www.instagram.com", sessions: 30 },
        ]),
      ),
      responseSet(channelsResponse([]), 0),
    );

    const subChannels = paidSocialRow(result)?.subChannels ?? [];
    expect(subChannels).toHaveLength(2);
    expect(subChannels.find((s) => s.source === "facebook")?.sessions).toBe(70);
    expect(subChannels.find((s) => s.source === "instagram")?.sessions).toBe(30);
    // One row per network means the UI can key on source without collisions.
    expect(new Set(subChannels.map((s) => s.source)).size).toBe(subChannels.length);
  });

  it("rolls the long tail into one 'other' row so shares still sum to 100", () => {
    const result = run(
      responseSet(
        channelsResponse([{ channel: "Paid Social", sessions: 100 }]),
        100,
        paidSocialResponse([
          { source: "facebook", sessions: 40 },
          { source: "instagram", sessions: 25 },
          { source: "linkedin", sessions: 15 },
          { source: "tiktok", sessions: 10 },
          { source: "snapchat", sessions: 6 },
          { source: "pinterest", sessions: 4 },
        ]),
      ),
      responseSet(channelsResponse([]), 0),
    );

    const subChannels = paidSocialRow(result)?.subChannels ?? [];
    expect(subChannels).toHaveLength(5);
    expect(subChannels.at(-1)).toMatchObject({ source: "other", sessions: 10 });
    const totalShare = subChannels.reduce((sum, s) => sum + s.share, 0);
    expect(totalShare).toBeCloseTo(100, 1);
  });

  it("matches previousSessions by canonical source across periods", () => {
    const result = run(
      responseSet(
        channelsResponse([{ channel: "Paid Social", sessions: 100 }]),
        100,
        paidSocialResponse([
          { source: "facebook", sessions: 80 },
          { source: "tiktok.com", sessions: 20 },
        ]),
      ),
      responseSet(
        channelsResponse([{ channel: "Paid Social", sessions: 40 }]),
        40,
        // Prior period spelled the same network differently — must still match.
        paidSocialResponse([{ source: "m.facebook.com", sessions: 40 }]),
      ),
    );

    const subChannels = paidSocialRow(result)?.subChannels ?? [];
    expect(subChannels.find((s) => s.source === "facebook")?.previousSessions).toBe(40);
    expect(subChannels.find((s) => s.source === "tiktok")?.previousSessions).toBeUndefined();
  });

  it("leaves non-social channels without a subChannels field", () => {
    const result = run(
      responseSet(
        channelsResponse([
          { channel: "Organic Search", sessions: 100 },
          { channel: "Direct", sessions: 50 },
        ]),
        150,
        paidSocialResponse([{ source: "facebook", sessions: 10 }]),
      ),
      responseSet(channelsResponse([]), 0),
    );

    const breakdown = result.trafficOverview?.channelBreakdown ?? [];
    expect(breakdown.find((c) => c.channel === "Organic Search")?.subChannels).toBeUndefined();
    expect(breakdown.find((c) => c.channel === "Direct")?.subChannels).toBeUndefined();
  });

  it("omits subChannels when the paid-social request came back empty", () => {
    const result = run(
      responseSet(channelsResponse([{ channel: "Paid Social", sessions: 100 }]), 100),
      responseSet(channelsResponse([]), 0),
    );

    expect(paidSocialRow(result)).toBeDefined();
    expect(paidSocialRow(result)?.subChannels).toBeUndefined();
  });
});
