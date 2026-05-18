"use client";

import { useState } from "react";

interface InfoTooltipProps {
  text: string;
  side?: "above" | "below";
}

export function InfoTooltip({ text, side = "above" }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  if (!text) return null;

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Icon — solid purple fill, white i */}
      <span
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 14, height: 14, borderRadius: "50%", flexShrink: 0, cursor: "default",
          background: "oklch(0.5 0.18 290)",
          color: "#fff",
          fontSize: 9, fontWeight: 700, lineHeight: 1,
          transform: visible ? "scale(1.12)" : "scale(1)",
          transition: "transform 0.15s ease",
          userSelect: "none",
        }}
      >
        i
      </span>

      {/* Bubble */}
      {visible && (
        <span
          style={{
            position: "absolute",
            ...(side === "above" ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }),
            left: "50%", marginLeft: -110,
            width: 220,
            background: "oklch(0.18 0.01 270)", color: "#fff",
            fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 6,
            whiteSpace: "normal", pointerEvents: "none", zIndex: 9999,
          }}
        >
          {text}
          <span style={{
            position: "absolute", left: "50%", marginLeft: -4,
            borderWidth: 4, borderStyle: "solid",
            ...(side === "above"
              ? { top: "100%", borderColor: "oklch(0.18 0.01 270) transparent transparent transparent" }
              : { bottom: "100%", borderColor: "transparent transparent oklch(0.18 0.01 270) transparent" }),
          }} />
        </span>
      )}
    </span>
  );
}
