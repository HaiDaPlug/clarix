"use client";

interface KeyBadgeProps {
  children: React.ReactNode;
  wide?: boolean;
}

function KeyBadge({ children, wide }: KeyBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: wide ? "8px 20px" : "8px 14px",
        borderRadius: "9px",
        border: "1px solid var(--rule)",
        backgroundColor: "rgba(245,243,239,0.95)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 0 var(--rule)",
        fontSize: "16px",
        fontWeight: 500,
        color: "var(--charcoal)",
        fontFamily: "var(--font-body)",
        letterSpacing: "0.01em",
        userSelect: "none",
        lineHeight: 1,
        minWidth: wide ? 76 : undefined,
      }}
    >
      {children}
    </span>
  );
}

function Sep({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "15px",
        color: "var(--slate-light)",
        letterSpacing: "0.02em",
        userSelect: "none",
      }}
    >
      {children}
    </span>
  );
}

export function KeyboardHints() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
      <KeyBadge>↑</KeyBadge>
      <Sep>,</Sep>
      <KeyBadge>↓</KeyBadge>
      <Sep>or</Sep>
      <KeyBadge wide>space</KeyBadge>
    </div>
  );
}
