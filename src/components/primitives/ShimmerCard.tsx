"use client";

const BEAM = (
  <div
    aria-hidden
    style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      borderRadius: "inherit",
      pointerEvents: "none",
    }}
  >
    <div
      className="shimmer-sweep"
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(90deg, transparent 0%, oklch(0.62 0.22 280 / 0.10) 40%, oklch(0.72 0.18 280 / 0.18) 50%, oklch(0.62 0.22 280 / 0.10) 60%, transparent 100%)",
      }}
    />
  </div>
);

export function ShimmerOverlay() {
  return BEAM;
}

export function ShimmerCard({
  loading,
  height,
  className,
  style,
  children,
}: {
  loading: boolean;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "1rem",
        backgroundColor: "var(--bone)",
        border: `1px solid ${loading ? "oklch(0.62 0.22 280 / 0.18)" : "var(--rule)"}`,
        height,
        ...style,
      }}
    >
      {children}
      {loading && BEAM}
    </div>
  );
}
