import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { TREND_POS, TREND_NEG, TREND_POS_BG, TREND_NEG_BG } from "../tokens";

export const fmtNum = (n: number) => n.toLocaleString("sv-SE");

export const sign = (n: number | null): string | null =>
  n === null ? null : n >= 0 ? `+${n}%` : `−${Math.abs(n)}%`;

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m} min ${s.toString().padStart(2, "0")} s`;
}

export function TrendPill({
  delta,
  positive,
  size = "md",
}: {
  delta: string | null;
  positive: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1",
    md: "px-3.5 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  } as const;
  const icon =
    size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  if (delta === null) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold tabular-nums ${sizes[size]}`}
        style={{ color: "oklch(0.6 0.01 270)", background: "oklch(0.94 0.005 270)" }}
      >
        —
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tabular-nums ${sizes[size]}`}
      style={{
        color: positive ? TREND_POS : TREND_NEG,
        background: positive ? TREND_POS_BG : TREND_NEG_BG,
      }}
    >
      {positive ? (
        <ArrowUpRight className={icon} strokeWidth={2.8} />
      ) : (
        <ArrowDownRight className={icon} strokeWidth={2.8} />
      )}
      {delta}
    </span>
  );
}
