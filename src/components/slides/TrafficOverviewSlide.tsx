"use client";

import { motion } from "motion/react";
import { ModuleProps } from "@/types/modules";
import { SlideHeader } from "@/components/primitives/SlideHeader";
import { TrendLine } from "@/components/charts/TrendLine";
import { formatNumber, formatChange } from "@/lib/utils/format";
import { Metric } from "@/types/schema";
import { cn } from "@/lib/utils";
import { Rule } from "@/components/primitives/Rule";
import { useLocale } from "@/lib/i18n";

// Soft coral/warm channel palette — mirrors dashboard ChannelBreakdown
const SLIDE_CHANNEL_COLORS: Record<string, string> = {
  organic:  "#E8826A",
  paid:     "#F2A07B",
  direct:   "#D98FA8",
  referral: "#C4917A",
};

function inferChannelKey(unit: string | undefined, label: string): string | null {
  if (unit === "percent") return null;
  const l = label.toLowerCase();
  if (l.includes("organic") || l.includes("organisk")) return "organic";
  if (l.includes("paid") || l.includes("betald") || l.includes("ads")) return "paid";
  if (l.includes("direct") || l.includes("direkt")) return "direct";
  if (l.includes("referral") || l.includes("hänvisning")) return "referral";
  return null;
}

function MiniMetric({ metric, delay = 0 }: { metric: Metric; delay?: number }) {
  const change = metric.previousValue !== undefined
    ? formatChange(metric.value, metric.previousValue)
    : null;
  const isGood = change
    ? (change.direction === "up" && metric.trendGood !== false) ||
      (change.direction === "down" && metric.trendGood === false)
    : null;

  const channelKey = inferChannelKey(metric.unit, metric.label);
  const dotColor = channelKey ? SLIDE_CHANNEL_COLORS[channelKey] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="py-4 flex items-start gap-3"
    >
      {dotColor && (
        <span
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: dotColor, flexShrink: 0, marginTop: 6,
          }}
        />
      )}
      <div className={cn(!dotColor && "pl-[20px]")}>
        <p className="eyebrow mb-2">{metric.label}</p>
        <p className="font-display text-2xl leading-none text-[var(--charcoal)]">
          {formatNumber(metric.value, metric.unit)}
        </p>
        {change && change.direction !== "flat" && (
          <p
            className={cn(
              "text-[11px] font-medium mt-1",
              isGood === true && "text-[var(--signal-up)]",
              isGood === false && "text-[var(--signal-down)]"
            )}
          >
            {change.sign}{change.value}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TrafficOverviewSlide({ data, variant }: ModuleProps) {
  const { t } = useLocale();
  const traffic = data.trafficOverview;
  if (!traffic) return null;

  const channelMetrics = [
    traffic.organicSessions,
    traffic.directSessions,
    traffic.paidSessions,
    traffic.referralSessions,
  ].filter(Boolean) as Metric[];

  const duration = traffic.avgSessionDuration ?? null;

  return (
    <div className="slide bg-[var(--bone)]">
      <div className="w-full">
        <SlideHeader
          eyebrow={t.trafficOverview.eyebrow}
          headline={t.trafficOverview.headline}
          headlineSize="2xl"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Primary metric + chart */}
          <motion.div
            className="md:col-span-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="mb-6">
              <p className="eyebrow mb-2">{traffic.totalSessions.label}</p>
              <p className="font-display text-[clamp(3rem,5vw,4.5rem)] leading-none tracking-tight text-[var(--charcoal)]">
                {formatNumber(traffic.totalSessions.value)}
              </p>
              {traffic.totalSessions.previousValue && (
                <p className="text-sm text-[var(--slate)] mt-2">
                  {(() => {
                    const c = formatChange(
                      traffic.totalSessions.value,
                      traffic.totalSessions.previousValue!
                    );
                    return `${c.sign}${c.value} ${t.trafficOverview.vsPrior}`;
                  })()}
                </p>
              )}
            </div>
            <TrendLine
              data={traffic.timeSeries}
              height={180}
              showAxes
              showGrid
              color="var(--charcoal)"
            />
          </motion.div>

          {/* Secondary metrics */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mb-0">{t.trafficOverview.byChannel}</p>
            {channelMetrics.map((m, i) => (
              <div key={i}>
                <MiniMetric metric={m} delay={0.15 + i * 0.06} />
                {(i < channelMetrics.length - 1 || duration) && <Rule light />}
              </div>
            ))}
            {duration && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15 + channelMetrics.length * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="py-4 flex items-start gap-3"
              >
                <div className="pl-[20px]">
                  <p className="eyebrow mb-2">{duration.label}</p>
                  <p className="font-display text-2xl leading-none text-[var(--charcoal)]">
                    {formatDuration(duration.value)}
                  </p>
                  {duration.previousValue !== undefined && (() => {
                    const change = formatChange(duration.value, duration.previousValue!);
                    const isGood = change.direction === "up" && duration.trendGood !== false;
                    return change.direction !== "flat" ? (
                      <p className={cn("text-[11px] font-medium mt-1", isGood ? "text-[var(--signal-up)]" : "text-[var(--signal-down)]")}>
                        {change.sign}{change.value}
                      </p>
                    ) : null;
                  })()}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Channel breakdown */}
        {variant !== "simplified" && traffic.channelBreakdown && (
          <motion.div
            className="mt-10 pt-8 border-t border-[var(--rule-light)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <p className="eyebrow mb-5">{t.trafficOverview.channelShare}</p>
            <div className="flex gap-6">
              {traffic.channelBreakdown.map((ch, i) => (
                <div key={i} className="flex-1">
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-[11px] text-[var(--slate)]">{ch.channel}</span>
                    <span className="text-sm font-medium text-[var(--charcoal)]">
                      {ch.share.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1 bg-[var(--rule-light)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[var(--charcoal)] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${ch.share}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
