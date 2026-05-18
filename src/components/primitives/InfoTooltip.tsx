"use client";

import { useEffect, useRef, useState } from "react";

interface InfoTooltipProps {
  text: string;
  side?: "above" | "below";
}

export function InfoTooltip({ text, side = "above" }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const hide = () => {
    setVisible(false);
    timerRef.current = setTimeout(() => setMounted(false), 200);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!text) return null;

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* Trigger — solid purple dot with white i */}
      <span
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 15, height: 15, borderRadius: "50%", flexShrink: 0, cursor: "default",
          background: visible ? "oklch(0.45 0.2 290)" : "oklch(0.5 0.18 290)",
          color: "#fff",
          fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: 0,
          transition: "background 0.15s ease, transform 0.15s ease",
          transform: visible ? "scale(1.15)" : "scale(1)",
          userSelect: "none",
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
        }}
      >
        i
      </span>

      {/* Bubble */}
      {mounted && (
        <span
          style={{
            position: "absolute",
            ...(side === "above"
              ? { bottom: "calc(100% + 12px)" }
              : { top: "calc(100% + 12px)" }),
            left: "50%",
            transform: `translateX(-50%) ${visible ? "translateY(0) scale(1)" : side === "above" ? "translateY(6px) scale(0.97)" : "translateY(-6px) scale(0.97)"}`,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.18s ease, transform 0.18s ease",
            width: 280,
            background: "oklch(0.14 0.02 270)",
            color: "#f0eee8",
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.6,
            letterSpacing: "0.01em",
            padding: "12px 16px",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)",
            whiteSpace: "normal",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {text}
          {/* Arrow */}
          <span
            style={{
              position: "absolute",
              left: "50%",
              marginLeft: -6,
              width: 12,
              height: 12,
              background: "oklch(0.14 0.02 270)",
              ...(side === "above"
                ? {
                    top: "100%",
                    marginTop: -6,
                    clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  }
                : {
                    bottom: "100%",
                    marginBottom: -6,
                    clipPath: "polygon(50% 0, 0 100%, 100% 100%)",
                  }),
            }}
          />
        </span>
      )}
    </span>
  );
}
