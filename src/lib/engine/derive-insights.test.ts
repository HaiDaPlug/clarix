import { describe, it, expect } from "vitest";
import { deriveInsights, hasSufficientData } from "./derive-insights";
import type { ReportData } from "@/types/schema";

// ─── Minimal fixture helpers ──────────────────────────────────────────────────

function metric(value: number, previousValue?: number) {
  return { value, previousValue, unit: "number" as const, label: "" };
}

const BASE_META = {
  clientName: "Test",
  agencyName: "Agency",
  reportType: "full" as const,
  cadence: "monthly" as const,
  period: { label: "Januari 2025", startDate: "2025-01-01", endDate: "2025-01-31" },
  availableSources: ["ga4" as const],
  generatedAt: "2025-02-01T00:00:00Z",
};

function baseData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    meta: BASE_META,
    trafficOverview: {
      totalSessions: metric(500, 450),
      timeSeries: [],
    },
    seoOverview: {
      totalClicks: metric(200),
      totalImpressions: metric(3000),
      avgPosition: metric(12),
      avgCtr: metric(6.7),
      timeSeries: [],
    },
    conversions: {
      totalConversions: metric(20, 18),
      conversionRate: metric(4.0, 4.0),
    },
    ...overrides,
  } as ReportData;
}

// ─── Channel concentration ────────────────────────────────────────────────────

describe("channel concentration", () => {
  it("does not fire when share is 47 (percent-encoded)", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        channelBreakdown: [
          { channel: "Organic Search", sessions: 235, share: 47 },
          { channel: "Direct", sessions: 265, share: 53 },
        ],
      },
    });
    const insights = deriveInsights(data);
    expect(insights.find((i) => i.type === "traffic_channel_concentrated")).toBeUndefined();
  });

  it("fires when share is 67.5 and sends human-readable value", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        channelBreakdown: [
          { channel: "Organic Search", sessions: 337, share: 67.5 },
          { channel: "Direct", sessions: 163, share: 32.5 },
        ],
      },
    });
    const insights = deriveInsights(data);
    const insight = insights.find((i) => i.type === "traffic_channel_concentrated");
    expect(insight).toBeDefined();
    expect(insight?.metrics.topChannelShare).toBe(68);
    expect(insight?.metrics.topChannelShare).not.toBe(6750);
  });

  it("fires when share is 0.675 (fraction-encoded) and normalizes it", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        channelBreakdown: [
          { channel: "Organic Search", sessions: 337, share: 0.675 },
          { channel: "Direct", sessions: 163, share: 0.325 },
        ],
      },
    });
    const insights = deriveInsights(data);
    const insight = insights.find((i) => i.type === "traffic_channel_concentrated");
    expect(insight).toBeDefined();
    expect(insight?.metrics.topChannelShare).toBe(68);
  });

  it("finds the dominant channel even when list is unsorted", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        channelBreakdown: [
          { channel: "Direct", sessions: 100, share: 20 },
          { channel: "Paid", sessions: 50, share: 10 },
          { channel: "Organic Search", sessions: 350, share: 70 },
        ],
      },
    });
    const insights = deriveInsights(data);
    const insight = insights.find((i) => i.type === "traffic_channel_concentrated");
    expect(insight).toBeDefined();
    expect(insight?.metrics.topChannel).toBe("Organic Search");
    expect(insight?.metrics.topChannelShare).toBe(70);
  });
});

// ─── Conversion rate — percentage-point deltas ────────────────────────────────

describe("conversion rate classification", () => {
  it("does not fire for tiny improvement (1.0 → 1.1, +0.1 points)", () => {
    const data = baseData({
      conversions: {
        totalConversions: metric(11, 10),
        conversionRate: metric(1.1, 1.0),
      },
    });
    const insights = deriveInsights(data);
    expect(insights.find((i) => i.type === "conversion_rate_improved")).toBeUndefined();
    expect(insights.find((i) => i.type === "conversion_rate_declined")).toBeUndefined();
  });

  it("does not fire when below minimum sessions (< 20)", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(10, 9),
        timeSeries: [],
      },
      conversions: {
        totalConversions: metric(5, 1),
        conversionRate: metric(5.0, 1.0),
      },
    });
    const insights = deriveInsights(data);
    expect(insights.find((i) => i.type === "conversion_rate_improved")).toBeUndefined();
  });

  it("fires improved when delta >= 0.5 points (e.g. 2.0 → 3.0)", () => {
    const data = baseData({
      conversions: {
        totalConversions: metric(15, 10),
        conversionRate: metric(3.0, 2.0),
      },
    });
    const insights = deriveInsights(data);
    expect(insights.find((i) => i.type === "conversion_rate_improved")).toBeDefined();
  });

  it("fires declined for 4.0 → 2.8 (-1.2 points)", () => {
    const data = baseData({
      conversions: {
        totalConversions: metric(14, 20),
        conversionRate: metric(2.8, 4.0),
      },
    });
    const insights = deriveInsights(data);
    const insight = insights.find((i) => i.type === "conversion_rate_declined");
    expect(insight).toBeDefined();
    expect(insight?.severity).toBe("warning");
  });

  it("fires critical for large decline (<= -2 points)", () => {
    const data = baseData({
      conversions: {
        totalConversions: metric(5, 25),
        conversionRate: metric(1.0, 5.0),
      },
    });
    const insights = deriveInsights(data);
    const insight = insights.find((i) => i.type === "conversion_rate_declined");
    expect(insight?.severity).toBe("critical");
  });
});

// ─── Bounce rate — percentage-point deltas ────────────────────────────────────

describe("bounce rate classification", () => {
  it("does not fire for movement within 2-point dead zone (40 → 41.5)", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        bounceRate: metric(41.5, 40.0),
      },
    });
    const insights = deriveInsights(data);
    expect(insights.find((i) => i.type === "engagement_down")).toBeUndefined();
    expect(insights.find((i) => i.type === "engagement_up")).toBeUndefined();
  });

  it("fires engagement_down when bounce increases by > 2 points", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        bounceRate: metric(50.0, 40.0),
      },
    });
    const insights = deriveInsights(data);
    expect(insights.find((i) => i.type === "engagement_down")).toBeDefined();
  });

  it("fires engagement_up when bounce decreases by > 2 points", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        bounceRate: metric(35.0, 45.0),
      },
    });
    const insights = deriveInsights(data);
    expect(insights.find((i) => i.type === "engagement_up")).toBeDefined();
  });
});

// ─── next_steps sufficiency gate ─────────────────────────────────────────────

describe("hasSufficientData next_steps", () => {
  it("returns true with 1 source when there is a warning/critical next_steps insight", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 700),
        timeSeries: [],
        organicSessions: metric(100, 200),
      },
    });
    const insights = deriveInsights(data);
    const sufficient = hasSufficientData("next_steps", insights, data);
    // traffic_drop_organic should push a warning targeting next_steps
    expect(sufficient).toBe(true);
  });

  it("returns false when no warning/critical insights target next_steps", () => {
    const data = baseData();
    const insights = deriveInsights(data);
    // baseData has flat traffic and flat conversion rate — no actionable next_steps
    const sufficient = hasSufficientData("next_steps", insights, data);
    expect(sufficient).toBe(false);
  });
});

// ─── No traffic_shift_channel remains ────────────────────────────────────────

describe("renamed type", () => {
  it("never produces traffic_shift_channel insights", () => {
    const data = baseData({
      trafficOverview: {
        totalSessions: metric(500, 450),
        timeSeries: [],
        channelBreakdown: [
          { channel: "Organic Search", sessions: 400, share: 80 },
          { channel: "Direct", sessions: 100, share: 20 },
        ],
      },
    });
    const insights = deriveInsights(data);
    // @ts-expect-error — intentionally checking removed type
    expect(insights.find((i) => i.type === "traffic_shift_channel")).toBeUndefined();
  });
});
