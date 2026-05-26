import { createHash } from "crypto";
import { AI_INSIGHTS_CACHE_VERSION } from "@/lib/ai-insights/types";
import type { ReportData } from "@/types/schema";

// ─── Canonical hash input ─────────────────────────────────────────────────────
// We hash a deterministic subset of ReportData — everything the advisor prompt
// actually reasons over. Volatile/debug fields (meta.generatedAt, raw API
// response objects, etc.) are intentionally excluded so they don't cause false
// cache misses.
//
// Also included:
//   AI_INSIGHTS_CACHE_VERSION — bumped when prompt logic / classifier / schema
//     changes intentionally; this is the single lever to bust all caches.
//   provider + model — different models produce different output; treat them as
//     distinct cache namespaces.

function canonicalHashInput(data: ReportData): object {
  const t = data.trafficOverview;
  const seo = data.seoOverview;
  const conv = data.conversions;
  const paid = data.paidOverview;

  // Sort channel breakdown by name so insertion order doesn't affect hash.
  const channels = (t?.channelBreakdown ?? [])
    .slice()
    .sort((a, b) => a.channel.localeCompare(b.channel))
    .map((ch) => ({ channel: ch.channel, share: ch.share, sessions: ch.sessions ?? null }));

  // Contact/enquiry pages drive a classified insight — include all page signals.
  const topPages = (data.topPages?.pages ?? [])
    .slice()
    .sort((a, b) => a.url.localeCompare(b.url))
    .map((p) => ({
      url: p.url,
      sessions: p.sessions ?? null,
      clicks: p.clicks ?? null,
      trend: p.trend ?? null,
    }));

  return {
    _version: AI_INSIGHTS_CACHE_VERSION,
    _provider: process.env.AI_INSIGHTS_PROVIDER ?? "unknown",
    _model:
      process.env.AI_INSIGHTS_PROVIDER === "anthropic"
        ? (process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6")
        : (process.env.OPENAI_MODEL ?? "gpt-4o-mini"),

    availableSources: [...(data.meta.availableSources ?? [])].sort(),

    traffic: {
      totalSessions: {
        value: t?.totalSessions?.value ?? null,
        prev: t?.totalSessions?.previousValue ?? null,
      },
      organicSessions: {
        value: t?.organicSessions?.value ?? null,
        prev: t?.organicSessions?.previousValue ?? null,
      },
      paidSessions: {
        value: t?.paidSessions?.value ?? null,
        prev: t?.paidSessions?.previousValue ?? null,
      },
      bounceRate: {
        value: t?.bounceRate?.value ?? null,
        prev: t?.bounceRate?.previousValue ?? null,
      },
      channels,
    },

    seo: {
      totalClicks: {
        value: seo?.totalClicks?.value ?? null,
        prev: seo?.totalClicks?.previousValue ?? null,
      },
      totalImpressions: {
        value: seo?.totalImpressions?.value ?? null,
        prev: seo?.totalImpressions?.previousValue ?? null,
      },
      avgPosition: {
        value: seo?.avgPosition?.value ?? null,
        prev: seo?.avgPosition?.previousValue ?? null,
      },
    },

    conversions: {
      totalConversions: {
        value: conv?.totalConversions?.value ?? null,
        prev: conv?.totalConversions?.previousValue ?? null,
      },
      conversionRate: {
        value: conv?.conversionRate?.value ?? null,
        prev: conv?.conversionRate?.previousValue ?? null,
      },
    },

    paid: {
      totalSpend: {
        value: paid?.totalSpend?.value ?? null,
        prev: paid?.totalSpend?.previousValue ?? null,
      },
      totalClicks: {
        value: paid?.totalClicks?.value ?? null,
        prev: paid?.totalClicks?.previousValue ?? null,
      },
      avgCpc: {
        value: paid?.avgCpc?.value ?? null,
        prev: paid?.avgCpc?.previousValue ?? null,
      },
      avgCtr: {
        value: paid?.avgCtr?.value ?? null,
        prev: paid?.avgCtr?.previousValue ?? null,
      },
      conversions: {
        value: paid?.conversions?.value ?? null,
        prev: paid?.conversions?.previousValue ?? null,
      },
      costPerConversion: {
        value: paid?.costPerConversion?.value ?? null,
        prev: paid?.costPerConversion?.previousValue ?? null,
      },
      roas: {
        value: paid?.roas?.value ?? null,
        prev: paid?.roas?.previousValue ?? null,
      },
    },

    topPages,
  };
}

export function hashAiInsightMetrics(data: ReportData): string {
  const input = canonicalHashInput(data);
  // JSON.stringify with sorted keys for determinism across V8 versions.
  const canonical = JSON.stringify(input, Object.keys(input).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

export function isFreshAiInsightsCache(
  cached: { metrics_hash: string; generated_at: string } | null,
  metricsHash: string,
): boolean {
  if (!cached || cached.metrics_hash !== metricsHash) return false;
  const ageHours = (Date.now() - new Date(cached.generated_at).getTime()) / 3_600_000;
  return ageHours < 24;
}
