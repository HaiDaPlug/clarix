"use client";

import { useEffect, useRef, useState } from "react";
import { BorderBeam } from "@/components/ui/border-beam";

type InfoTooltipProps =
  | { text: string; title?: never; body?: never; example?: never; side?: "above" | "below" }
  | { title: string; body: string; example?: string; text?: never; side?: "above" | "below" };

export function InfoTooltip(props: InfoTooltipProps) {
  const title = props.title ?? null;
  const body = props.body ?? props.text ?? "";
  const example = props.example ?? null;
  const side = props.side ?? "below";

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
    timerRef.current = setTimeout(() => setMounted(false), 220);
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
          width: 16, height: 16, borderRadius: "50%", flexShrink: 0, cursor: "default",
          background: visible ? "oklch(0.42 0.2 290)" : "oklch(0.5 0.18 290)",
          color: "#fff",
          fontSize: 10, fontWeight: 800, lineHeight: 1,
          transition: "background 0.15s ease, transform 0.15s ease",
          transform: visible ? "scale(1.18)" : "scale(1)",
          userSelect: "none",
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
        }}
      >
        i
      </span>

      {/* Bubble — anchored top-right of the trigger */}
      {mounted && (
        <span
          style={{
            position: "absolute",
            top: side === "below" ? "calc(100% + 10px)" : "auto",
            bottom: side === "above" ? "calc(100% + 10px)" : "auto",
            left: "50%",
            transform: `translateX(-12px) ${visible ? "translateY(0) scale(1)" : "translateY(-5px) scale(0.97)"}`,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.18s ease, transform 0.18s ease",
            width: 280,
            background: "#fdfcfb",
            borderRadius: 16,
            boxShadow: "0 4px 6px rgba(0,0,0,0.03), 0 16px 48px rgba(0,0,0,0.10)",
            border: "1px solid rgba(0,0,0,0.05)",
            padding: "16px 18px",
            whiteSpace: "normal",
            pointerEvents: "none",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* Title */}
          {title && (
            <span style={{
              display: "block",
              fontSize: 15,
              fontWeight: 700,
              color: "#0f0e0b",
              lineHeight: 1.3,
              marginBottom: 7,
              letterSpacing: "-0.015em",
            }}>
              {title}
            </span>
          )}

          {/* Body */}
          <span style={{
            display: "block",
            fontSize: 14,
            fontWeight: 400,
            color: "#3a3830",
            lineHeight: 1.65,
          }}>
            {body}
          </span>

          {/* Example box */}
          {example && (
            <span style={{
              display: "block",
              marginTop: 11,
              background: "oklch(0.96 0.005 270)",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13,
              color: "#3a3830",
              lineHeight: 1.55,
            }}>
              <span style={{ fontWeight: 700 }}>Exempel: </span>
              {example}
            </span>
          )}

          {/* Clarix accent border beam */}
          <BorderBeam
            duration={5}
            size={120}
            colorFrom="#FF4D9E"
            colorTo="#FFB830"
            borderWidth={1.5}
          />
        </span>
      )}
    </span>
  );
}
