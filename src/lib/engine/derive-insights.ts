import type { ReportData } from "@/types/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightType =
  | "traffic_up_broadly"
  | "traffic_down_broadly"
  | "traffic_drop_organic"
  | "traffic_drop_paid"
  | "traffic_channel_concentrated"
  | "engagement_down"
  | "engagement_up"
  | "contact_page_lost_visibility"
  | "paid_roas_strong"
  | "paid_cost_up_conversions_flat"
  | "seo_positions_improving"
  | "seo_positions_declining"
  | "conversion_rate_improved"
  | "conversion_rate_declined"
  | "ai_visibility_untracked"
  | "data_missing_tracking_issue";

export type InsightSeverity = "positive" | "neutral" | "warning" | "critical";

export type InsightSurface =
  | "dashboard_hero"
  | "next_steps"
  | "slide_hero"
  | "slide_insight"
  | "slide_recs"
  | "slide_recap";

export interface Insight {
  type: InsightType;
  severity: InsightSeverity;
  metrics: Record<string, number | string | null>;
  surface: InsightSurface[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trafficSeverity(delta: number): InsightSeverity {
  if (delta > 10) return "positive";
  if (delta >= -5) return "neutral";
  if (delta >= -20) return "warning";
  return "critical";
}

function pct(value: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((value - previous) / previous) * 100);
}

// Normalize share regardless of whether the mapper returns 0.675 or 67.5.
// The rest of the app treats share as a percentage, but this makes the
// classifier safe against a future mapper change.
function shareAsPercent(share: number): number {
  return share <= 1 ? share * 100 : share;
}

// ─── Classifier ───────────────────────────────────────────────────────────────

export function deriveInsights(data: ReportData): Insight[] {
  const insights: Insight[] = [];
  const traffic = data.trafficOverview;
  const seo = data.seoOverview;
  const paid = data.paidOverview;
  const conv = data.conversions;
  const pages = data.topPages;

  // ── Traffic overall ────────────────────────────────────────────────────────

  const sessions = traffic?.totalSessions;
  if (sessions?.value != null && sessions.previousValue != null) {
    const delta = pct(sessions.value, sessions.previousValue);
    if (delta !== null) {
      const severity = trafficSeverity(delta);
      const type: InsightType = delta >= 0 ? "traffic_up_broadly" : "traffic_down_broadly";
      insights.push({
        type,
        severity,
        metrics: {
          visits: sessions.value,
          visitsPrev: sessions.previousValue,
          visitsDelta: delta,
        },
        surface: ["dashboard_hero", "slide_hero", "slide_insight", "slide_recap"],
      });
    }
  } else if (!sessions?.value) {
    insights.push({
      type: "data_missing_tracking_issue",
      severity: "warning",
      metrics: { reason: "no_sessions_data" },
      surface: ["dashboard_hero", "slide_hero", "slide_insight", "slide_recs", "slide_recap"],
    });
  }

  // ── Organic traffic drop ───────────────────────────────────────────────────

  const organic = traffic?.organicSessions;
  if (organic?.value != null && organic.previousValue != null) {
    const delta = pct(organic.value, organic.previousValue);
    if (delta !== null && delta < -10) {
      insights.push({
        type: "traffic_drop_organic",
        severity: delta < -20 ? "critical" : "warning",
        metrics: {
          organicVisits: organic.value,
          organicPrev: organic.previousValue,
          organicDelta: delta,
        },
        surface: ["slide_insight", "slide_recs", "next_steps"],
      });
    }
  }

  // ── Paid traffic drop ──────────────────────────────────────────────────────

  const paidSessions = traffic?.paidSessions;
  if (paidSessions?.value != null && paidSessions.previousValue != null) {
    const delta = pct(paidSessions.value, paidSessions.previousValue);
    if (delta !== null && delta < -10) {
      insights.push({
        type: "traffic_drop_paid",
        severity: delta < -20 ? "critical" : "warning",
        metrics: {
          paidVisits: paidSessions.value,
          paidPrev: paidSessions.previousValue,
          paidDelta: delta,
        },
        surface: ["slide_insight", "slide_recs", "next_steps"],
      });
    }
  }

  // ── Channel concentration ──────────────────────────────────────────────────
  // Detects when one channel dominates (>60% share). This is not true shift
  // detection — that would require comparing previous share. Renamed from
  // traffic_shift_channel to reflect what we actually measure.

  const channels = traffic?.channelBreakdown ?? [];
  if (channels.length >= 2) {
    // Explicitly find the dominant channel rather than assuming sorted order.
    const dominant = channels.reduce((best, ch) =>
      shareAsPercent(ch.share) > shareAsPercent(best.share) ? ch : best,
    );
    const dominantShareNorm = shareAsPercent(dominant.share);
    const dominantSharePct = Math.round(dominantShareNorm);
    if (dominantShareNorm > 60) {
      insights.push({
        type: "traffic_channel_concentrated",
        severity: "neutral",
        metrics: {
          topChannel: dominant.channel,
          topChannelShare: dominantSharePct,
          topChannelVisits: dominant.sessions,
        },
        surface: ["slide_hero", "slide_insight"],
      });
    }
  }

  // ── Engagement ─────────────────────────────────────────────────────────────
  // Use percentage-point delta, not relative percent change.
  // Relative % is misleading: 40% → 44% bounce is only +4 points but looks
  // like +10% relative and would cross old thresholds as a warning.

  const bounce = traffic?.bounceRate;
  if (bounce?.value != null && bounce.previousValue != null) {
    const pointDelta = bounce.value - bounce.previousValue;
    // Dead zone: ±2 percentage points treated as noise
    if (pointDelta > 2) {
      // Bounce rate going up = worse engagement
      insights.push({
        type: "engagement_down",
        severity: pointDelta > 8 ? "critical" : "warning",
        metrics: {
          bounceRate: bounce.value,
          bounceRatePrev: bounce.previousValue,
          bounceRateDelta: Math.round(pointDelta * 10) / 10,
        },
        surface: ["slide_insight", "slide_recs", "slide_recap", "next_steps"],
      });
    } else if (pointDelta < -2) {
      // Bounce rate going down = better engagement
      insights.push({
        type: "engagement_up",
        severity: "positive",
        metrics: {
          bounceRate: bounce.value,
          bounceRatePrev: bounce.previousValue,
          bounceRateDelta: Math.round(pointDelta * 10) / 10,
        },
        surface: ["slide_insight", "slide_recap"],
      });
    }
  }

  // ── Contact page visibility ────────────────────────────────────────────────

  const contactPage = pages?.pages?.find(
    (p) => p.url.includes("kontakt") || p.url.includes("contact"),
  );
  if (contactPage?.trend === "down") {
    insights.push({
      type: "contact_page_lost_visibility",
      severity: "warning",
      metrics: {
        contactUrl: contactPage.url,
        contactSessions: contactPage.sessions ?? null,
        contactClicks: contactPage.clicks ?? null,
      },
      surface: ["slide_insight", "slide_recs", "next_steps"],
    });
  }

  // ── Paid ROAS ─────────────────────────────────────────────────────────────

  if (paid?.roas?.value != null) {
    if (paid.roas.value >= 3) {
      insights.push({
        type: "paid_roas_strong",
        severity: "positive",
        metrics: {
          roas: paid.roas.value,
          spend: paid.totalSpend?.value ?? null,
        },
        surface: ["slide_recs", "next_steps"],
      });
    } else if (paid.totalSpend?.value != null) {
      const convDelta = conv?.totalConversions?.value != null && conv.totalConversions.previousValue != null
        ? pct(conv.totalConversions.value, conv.totalConversions.previousValue)
        : null;
      const spendDelta = paid.totalSpend.previousValue != null
        ? pct(paid.totalSpend.value, paid.totalSpend.previousValue)
        : null;
      if (spendDelta !== null && spendDelta > 5 && (convDelta === null || convDelta < 5)) {
        insights.push({
          type: "paid_cost_up_conversions_flat",
          severity: "warning",
          metrics: {
            spend: paid.totalSpend.value,
            spendDelta,
            conversions: conv?.totalConversions?.value ?? null,
            convDelta,
            roas: paid.roas.value,
          },
          surface: ["slide_recs", "slide_insight", "next_steps"],
        });
      }
    }
  }

  // ── SEO positions ─────────────────────────────────────────────────────────
  // Use absolute delta (positions gained/lost), not percentage.
  // Percentage delta is misleading for small position numbers:
  // position 2→3 = +50% but is a trivial fluctuation.

  const avgPos = seo?.avgPosition;
  if (avgPos?.value != null && avgPos.previousValue != null) {
    const absDelta = Math.round(avgPos.value - avgPos.previousValue);
    // Lower position number = better ranking, so negative absDelta = improving
    if (absDelta < -1) {
      insights.push({
        type: "seo_positions_improving",
        severity: "positive",
        metrics: {
          avgPosition: avgPos.value,
          avgPositionPrev: avgPos.previousValue,
          avgPositionDelta: absDelta,
        },
        surface: ["slide_insight", "slide_recap"],
      });
    } else if (absDelta > 2) {
      insights.push({
        type: "seo_positions_declining",
        severity: absDelta > 5 ? "critical" : "warning",
        metrics: {
          avgPosition: avgPos.value,
          avgPositionPrev: avgPos.previousValue,
          avgPositionDelta: absDelta,
        },
        surface: ["slide_insight", "slide_recs", "next_steps"],
      });
    }
  }

  // ── Conversions ───────────────────────────────────────────────────────────
  // Use percentage-point delta on conversionRate, not relative percent change.
  // Example: 1.0% → 1.1% is only +0.1 points — not meaningful.
  // Relative math would call that +10%, which easily crosses old thresholds.
  // Dead zone: < 0.5 percentage points treated as noise.
  // Minimum volume: require at least 20 sessions in both current and previous
  // period to avoid firing on tiny denominators in either period.

  const convRate = conv?.conversionRate;
  const currentSessions = traffic?.totalSessions?.value ?? 0;
  const previousSessions = traffic?.totalSessions?.previousValue ?? 0;
  if (
    convRate?.value != null &&
    convRate.previousValue != null &&
    currentSessions >= 20 &&
    previousSessions >= 20
  ) {
    const pointDelta = convRate.value - convRate.previousValue;
    if (pointDelta >= 0.5) {
      insights.push({
        type: "conversion_rate_improved",
        severity: "positive",
        metrics: {
          conversionRate: convRate.value,
          conversionRatePrev: convRate.previousValue,
          conversionRateDelta: Math.round(pointDelta * 10) / 10,
          conversions: conv?.totalConversions?.value ?? null,
        },
        surface: ["slide_insight", "slide_recap"],
      });
    } else if (pointDelta <= -0.5) {
      insights.push({
        type: "conversion_rate_declined",
        severity: pointDelta <= -2 ? "critical" : "warning",
        metrics: {
          conversionRate: convRate.value,
          conversionRatePrev: convRate.previousValue,
          conversionRateDelta: Math.round(pointDelta * 10) / 10,
          conversions: conv?.totalConversions?.value ?? null,
        },
        surface: ["slide_insight", "slide_recs", "next_steps"],
      });
    }
  }

  // ── AI visibility ─────────────────────────────────────────────────────────

  // Always flag — we don't track AI traffic yet
  insights.push({
    type: "ai_visibility_untracked",
    severity: "neutral",
    metrics: {},
    surface: ["slide_recap"],
  });

  // Sort: critical first, then warning, positive, neutral
  const order: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    positive: 2,
    neutral: 3,
  };

  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ─── Sufficiency gates ────────────────────────────────────────────────────────
// Returns true if a surface has enough data to generate AI copy.

export function hasSufficientData(
  surface: InsightSurface,
  insights: Insight[],
  data: ReportData,
): boolean {
  const forSurface = insights.filter((i) => i.surface.includes(surface));

  switch (surface) {
    case "dashboard_hero":
    case "slide_hero":
      return (data.trafficOverview?.totalSessions?.value ?? 0) > 0;

    case "slide_insight":
      // Needs a previous period to compare — otherwise there's nothing to analyse
      return (data.trafficOverview?.totalSessions?.previousValue ?? 0) > 0;

    case "slide_recs":
      return forSurface.some(
        (i) => i.severity === "warning" || i.severity === "critical",
      );

    case "slide_recap":
      return forSurface.filter((i) => i.type !== "ai_visibility_untracked").length > 0;

    case "next_steps":
      // Gate on actual actionable insights targeting this surface, not source count.
      // A client with 1 connected source but real warning/critical signals should
      // still get next_steps copy.
      return forSurface.some(
        (i) => i.severity === "warning" || i.severity === "critical",
      );

    default:
      return false;
  }
}
