import { NoiseTexture } from "@/components/ui/noise-texture";
import { TREND_POS, TREND_NEG } from "../tokens";

export const pos = (s: string) => (
  <span className="font-semibold" style={{ color: TREND_POS }}>
    {s}
  </span>
);

export const neg = (s: string) => (
  <span className="font-semibold" style={{ color: TREND_NEG }}>
    {s}
  </span>
);

export const trendSpan = (delta: number | null, formatted: string | null) => {
  if (formatted === null || delta === null) return formatted ?? "—";
  if (delta > 0) return pos(formatted);
  if (delta < 0) return neg(formatted);
  return <span className="font-semibold">{formatted}</span>;
};

export function AISummary({
  children,
  label = "Strategisk sammanfattning",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/20 p-6 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)] sm:p-8"
      style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
    >
      <NoiseTexture preset="cinematic" blendMode="overlay" />
      <div className="relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
          {label}
        </p>
        <div className="mt-2 space-y-3 text-[1.15rem] font-medium leading-[1.6] tracking-[-0.01em] text-white/95 sm:text-[1.25rem] [&_span]:text-white [&_span]:font-bold">
          {children}
        </div>
      </div>
    </div>
  );
}
