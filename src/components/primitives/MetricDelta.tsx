import { cn } from "@/lib/utils";
import { Metric } from "@/types/schema";
import { formatNumber, formatChange } from "@/lib/utils/format";

interface MetricDeltaProps {
  metric: Metric;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { value: "text-2xl", label: "text-[11px]", delta: "text-[10px]" },
  md: { value: "text-4xl", label: "text-[12px]", delta: "text-[11px]" },
  lg: { value: "text-6xl", label: "text-[13px]", delta: "text-[12px]" },
};

export function MetricDelta({ metric, className, size = "md" }: MetricDeltaProps) {
  const s = sizes[size];
  const change = metric.previousValue !== undefined
    ? formatChange(metric.value, metric.previousValue)
    : null;

  const isGood = change
    ? (change.direction === "up" && metric.trendGood !== false) ||
      (change.direction === "down" && metric.trendGood === false)
    : null;

  const deltaColor = isGood === true
    ? "text-[var(--signal-up)]"
    : isGood === false
    ? "text-[var(--signal-down)]"
    : "text-[var(--slate)]";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className={cn("eyebrow")}>{metric.label}</p>
      <p className={cn("font-display leading-none tracking-tight", s.value)}>
        {formatNumber(metric.value, metric.unit)}
      </p>
      {change && change.direction !== "flat" && (
        <p className={cn("font-medium", deltaColor, s.delta)}>
          {change.sign}{change.value} vs prior period
        </p>
      )}
    </div>
  );
}
