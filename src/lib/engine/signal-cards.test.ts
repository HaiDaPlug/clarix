import { describe, it, expect } from "vitest";
import { deriveSignalCards } from "./signal-cards";
import type { Insight } from "./derive-insights";

function insight(over: Partial<Insight> & Pick<Insight, "type" | "severity">): Insight {
  return {
    metrics: {},
    surface: ["slide_insight"],
    ...over,
  };
}

describe("deriveSignalCards", () => {
  it("renders cards from classified insights — not hardcoded copy", () => {
    const cards = deriveSignalCards([
      insight({ type: "traffic_down_broadly", severity: "warning", metrics: { visitsDelta: -7 } }),
    ]);
    expect(cards).toHaveLength(1);
    // The bug this fixes: traffic was DOWN, so the card must say so — never "Trafiken växer".
    expect(cards[0].label).toBe("Trafiken minskar");
    expect(cards[0].body).toContain("7 %");
    expect(cards[0].positive).toBe(false);
  });

  it("injects the real number into the body from metrics", () => {
    const cards = deriveSignalCards([
      insight({ type: "engagement_down", severity: "warning", metrics: { bounceRateDelta: 4.3 } }),
    ]);
    expect(cards[0].body).toContain("4,3 punkter");
  });

  it("formats a conversion rate to 2 decimals with a comma — not raw precision", () => {
    const cards = deriveSignalCards([
      insight({ type: "conversion_rate_improved", severity: "positive", metrics: { conversionRate: 3.502 } }),
    ]);
    // Regression: was rendering "3,502 %" — must be "3,50 %".
    expect(cards[0].body).toContain("3,50 %");
    expect(cards[0].body).not.toContain("3,502");
  });

  it("formats ROAS to 1 decimal with a comma", () => {
    const cards = deriveSignalCards([
      insight({ type: "paid_roas_strong", severity: "positive", metrics: { roas: 4.25 } }),
    ]);
    expect(cards[0].body).toContain("4,3×");
  });

  it("orders by severity (critical → warning → positive) and caps at 3", () => {
    const cards = deriveSignalCards([
      insight({ type: "engagement_up", severity: "positive" }),
      insight({ type: "conversion_rate_declined", severity: "critical", metrics: { conversionRate: 1.2 } }),
      insight({ type: "traffic_drop_organic", severity: "warning", metrics: { organicDelta: -15 } }),
      insight({ type: "seo_positions_improving", severity: "positive" }),
    ]);
    expect(cards).toHaveLength(3);
    expect(cards[0].label).toBe("Färre tar nästa steg"); // critical first
    expect(cards.map((c) => c.label)).not.toContain("Rankingen klättrar"); // 4th dropped
  });

  it("shows fewer than 3 when fewer qualify — never pads with filler", () => {
    const cards = deriveSignalCards([
      insight({ type: "traffic_up_broadly", severity: "positive", metrics: { visitsDelta: 12 } }),
      insight({ type: "engagement_up", severity: "positive" }),
    ]);
    expect(cards).toHaveLength(2);
  });

  it("ignores meta-insights with no card copy (e.g. ai_visibility_untracked)", () => {
    const cards = deriveSignalCards([
      insight({ type: "ai_visibility_untracked", severity: "neutral", surface: ["slide_recap"] }),
      insight({ type: "data_missing_tracking_issue", severity: "warning" }),
    ]);
    expect(cards).toHaveLength(0);
  });

  it("dedupes by type so two cards never say the same thing", () => {
    const cards = deriveSignalCards([
      insight({ type: "traffic_down_broadly", severity: "warning", metrics: { visitsDelta: -7 } }),
      insight({ type: "traffic_down_broadly", severity: "critical", metrics: { visitsDelta: -30 } }),
    ]);
    expect(cards).toHaveLength(1);
  });

  it("falls back to a complete sentence when the metric is missing", () => {
    const cards = deriveSignalCards([
      insight({ type: "traffic_down_broadly", severity: "warning", metrics: {} }),
    ]);
    expect(cards[0].body).not.toContain("undefined");
    expect(cards[0].body.length).toBeGreaterThan(0);
  });
});
