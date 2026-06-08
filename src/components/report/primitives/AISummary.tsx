import { Sparkles } from "lucide-react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { TREND_POS, TREND_NEG, AI_GRADIENT, AI_SHADOW, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER } from "../tokens";

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
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
      style={{
        background: AI_GRADIENT,
        boxShadow: AI_SHADOW.replace(/_/g, " "),
        border: `1px solid ${AI_BORDER}`,
      }}
    >
      <div className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-32 -right-10 h-96 w-96 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5), transparent 70%)" }} />
      <svg aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-0" width="500" height="500" viewBox="0 0 500 500" fill="none">
        <circle cx="250" cy="250" r="120" stroke="oklch(0.62 0.22 295)" strokeWidth="1.5" opacity="0.25" />
        <circle cx="250" cy="250" r="180" stroke="oklch(0.62 0.22 295)" strokeWidth="1" opacity="0.15" />
        <circle cx="250" cy="250" r="240" stroke="oklch(0.62 0.22 295)" strokeWidth="0.75" opacity="0.08" />
      </svg>
      <NoiseTexture preset="fine" blendMode="soft-light" opacity={0.45} />
      {/* Icon badge — top right */}
      <div
        className="pointer-events-none absolute right-6 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_8px_24px_-8px_rgba(139,92,246,0.5)]"
        style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 295), oklch(0.65 0.2 255))" }}
      >
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: AI_TEXT_SECONDARY }}>
          {label}
        </p>
        <div className="mt-2 space-y-3 text-[1.15rem] font-medium leading-[1.6] tracking-[-0.01em] sm:text-[1.25rem]" style={{ color: AI_TEXT_PRIMARY }}>
          {children}
        </div>
      </div>
    </div>
  );
}
