import { AI_INSIGHTS_PROMPT_VERSION } from "@/lib/ai-insights/types";
import type { ReportData } from "@/types/schema";

export function hashAiInsightMetrics(data: ReportData): string {
  const t = data.trafficOverview;
  const conv = data.conversions;
  const paid = data.paidOverview;

  // Stable channel signature: sort by channel name so order doesn't affect hash.
  const channelSig = (t?.channelBreakdown ?? [])
    .slice()
    .sort((a, b) => a.channel.localeCompare(b.channel))
    .map((ch) => `${ch.channel}:${ch.share}`)
    .join(";");

  // Stable top-pages signature: contact page trend drives an insight, so include it.
  const contactPageSig = (data.topPages?.pages ?? [])
    .filter((p) => p.url.includes("kontakt") || p.url.includes("contact"))
    .map((p) => `${p.url}:${p.trend ?? ""}:${p.sessions ?? 0}:${p.clicks ?? 0}`)
    .join(";");

  const key = [
    AI_INSIGHTS_PROMPT_VERSION,
    t?.totalSessions?.value ?? 0,
    t?.totalSessions?.previousValue ?? 0,
    t?.organicSessions?.value ?? 0,
    t?.organicSessions?.previousValue ?? 0,
    t?.paidSessions?.value ?? 0,
    t?.paidSessions?.previousValue ?? 0,
    t?.bounceRate?.value ?? 0,
    t?.bounceRate?.previousValue ?? 0,
    data.seoOverview?.totalClicks?.value ?? 0,
    data.seoOverview?.avgPosition?.value ?? 0,
    data.seoOverview?.avgPosition?.previousValue ?? 0,
    conv?.conversionRate?.value ?? 0,
    conv?.conversionRate?.previousValue ?? 0,
    conv?.totalConversions?.value ?? 0,
    conv?.totalConversions?.previousValue ?? 0,
    paid?.totalSpend?.value ?? 0,
    paid?.totalSpend?.previousValue ?? 0,
    paid?.roas?.value ?? 0,
    channelSig,
    contactPageSig,
    data.meta.availableSources.join(","),
  ].join("|");

  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function isFreshAiInsightsCache(
  cached: { metrics_hash: string; generated_at: string } | null,
  metricsHash: string,
): boolean {
  if (!cached || cached.metrics_hash !== metricsHash) return false;
  const ageHours = (Date.now() - new Date(cached.generated_at).getTime()) / 3_600_000;
  return ageHours < 24;
}
