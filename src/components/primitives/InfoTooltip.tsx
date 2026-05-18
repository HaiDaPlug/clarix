"use client";

import { useEffect, useRef, useState } from "react";

interface InfoTooltipProps {
  title: string;
  body: string;
  example?: string;
  side?: "above" | "below";
}

export function InfoTooltip({ title, body, example, side = "above" }: InfoTooltipProps) {
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

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* Trigger */}
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
              ? { bottom: "calc(100% + 14px)" }
              : { top: "calc(100% + 14px)" }),
            left: "50%",
            transform: `translateX(-50%) ${visible ? "translateY(0) scale(1)" : side === "above" ? "translateY(6px) scale(0.97)" : "translateY(-6px) scale(0.97)"}`,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.18s ease, transform 0.18s ease",
            width: 300,
            background: "#ffffff",
            borderRadius: 14,
            boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14)",
            border: "1px solid rgba(0,0,0,0.06)",
            borderLeft: "3px solid oklch(0.5 0.18 290)",
            padding: "14px 16px",
            whiteSpace: "normal",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          {/* Title */}
          <span style={{
            display: "block",
            fontSize: 13,
            fontWeight: 700,
            color: "#0f0e0b",
            lineHeight: 1.3,
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}>
            {title}
          </span>

          {/* Body */}
          <span style={{
            display: "block",
            fontSize: 12.5,
            fontWeight: 400,
            color: "#3a3830",
            lineHeight: 1.6,
          }}>
            {body}
          </span>

          {/* Example box */}
          {example && (
            <span style={{
              display: "block",
              marginTop: 10,
              background: "oklch(0.96 0.005 270)",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              color: "#3a3830",
              lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 700 }}>Exempel: </span>
              {example}
            </span>
          )}

          {/* Arrow */}
          <span
            style={{
              position: "absolute",
              left: "50%",
              marginLeft: -7,
              width: 14,
              height: 8,
              overflow: "hidden",
              ...(side === "above"
                ? { top: "100%" }
                : { bottom: "100%", transform: "scaleY(-1)" }),
            }}
          >
            <span style={{
              position: "absolute",
              width: 12,
              height: 12,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.06)",
              borderLeft: "3px solid oklch(0.5 0.18 290)",
              top: -7,
              left: 1,
              transform: "rotate(45deg)",
              borderRadius: 2,
            }} />
          </span>
        </span>
      )}
    </span>
  );
}
