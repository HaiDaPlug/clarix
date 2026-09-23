"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type InfoTooltipProps =
  | { text: string; title?: never; body?: never; example?: never; side?: "above" | "below" }
  | { title: string; body: string; example?: string; text?: never; side?: "above" | "below" };

// Unscaled bubble geometry. The bubble is drawn at these numbers and then
// scaled to match its host, so every offset below is a scale-1 value.
const BUBBLE_W = 280;
const TRIGGER_SIZE = 16;
const GAP = 10;
const EDGE_MARGIN = 12;

type Anchor = { left: number; top: number; scale: number; flip: boolean };

export function InfoTooltip(props: InfoTooltipProps) {
  const title = props.title ?? null;
  const body = props.body ?? props.text ?? "";
  const example = props.example ?? null;
  const side = props.side ?? "below";

  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    const el = triggerRef.current;
    if (!el) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const r = el.getBoundingClientRect();
    // The trigger is 16px at scale 1, so its painted width tells us the scale
    // of whatever transformed canvas it lives on — no context plumbing needed.
    const scale = r.width > 0 ? r.width / TRIGGER_SIZE : 1;
    setAnchor({ left: r.left + r.width / 2, top: r.top, scale, flip: false });
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const hide = () => {
    setVisible(false);
    timerRef.current = setTimeout(() => setAnchor(null), 220);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Fixed positioning detaches from the page, so any scroll or resize would
  // strand the bubble beside a trigger that has moved. Dismiss instead of
  // chasing it — the pointer has left the trigger by then anyway.
  useEffect(() => {
    if (!anchor) return;
    const dismiss = () => hide();
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [anchor]);

  // Measure once mounted: the bubble's height depends on how much copy it
  // holds, so whether it fits above the trigger can only be known after paint.
  // A plain effect is enough — it runs before the double-rAF that fades the
  // bubble in, so any flip happens while it is still invisible.
  useEffect(() => {
    if (!anchor || anchor.flip) return;
    const el = bubbleRef.current;
    if (!el) return;
    const h = el.offsetHeight * anchor.scale;
    const gap = GAP * anchor.scale;
    const fitsAbove = anchor.top - gap - h >= EDGE_MARGIN;
    const fitsBelow = anchor.top + TRIGGER_SIZE * anchor.scale + gap + h <= window.innerHeight - EDGE_MARGIN;
    const wants = side === "above" ? fitsAbove : fitsBelow;
    const other = side === "above" ? fitsBelow : fitsAbove;
    if (!wants && other) setAnchor({ ...anchor, flip: true });
  }, [anchor, side]);

  const placement = anchor && anchor.flip ? (side === "above" ? "below" : "above") : side;

  let bubbleStyle: React.CSSProperties | null = null;
  if (anchor) {
    const { left, top, scale } = anchor;
    const gap = GAP * scale;
    // Keep the original overhang: the bubble's left edge sits just left of the
    // trigger's centre and runs rightward, so the "i" reads as its corner.
    let x = left - EDGE_MARGIN * scale;
    const width = BUBBLE_W * scale;
    const maxX = window.innerWidth - width - EDGE_MARGIN;
    if (x > maxX) x = maxX;
    if (x < EDGE_MARGIN) x = EDGE_MARGIN;

    bubbleStyle = {
      position: "fixed",
      left: x,
      ...(placement === "above"
        ? { top: top - gap, transformOrigin: "bottom left" }
        : { top: top + TRIGGER_SIZE * scale + gap, transformOrigin: "top left" }),
      transform: [
        placement === "above" ? "translateY(-100%)" : "",
        `scale(${scale})`,
        visible ? "translateY(0)" : `translateY(${placement === "above" ? 5 : -5}px)`,
      ]
        .filter(Boolean)
        .join(" "),
      opacity: visible ? 1 : 0,
      transition: "opacity 0.18s ease, transform 0.18s ease",
      width: BUBBLE_W,
      background: "#fdfcfb",
      borderRadius: 16,
      boxShadow: "0 4px 6px rgba(0,0,0,0.03), 0 16px 48px rgba(0,0,0,0.10)",
      border: "1px solid rgba(0,0,0,0.05)",
      padding: "16px 18px",
      whiteSpace: "normal",
      pointerEvents: "none",
      zIndex: 9999,
      overflow: "hidden",
      display: "block",
    };
  }

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {/* Trigger */}
      <span
        ref={triggerRef}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: TRIGGER_SIZE, height: TRIGGER_SIZE, borderRadius: "50%", flexShrink: 0, cursor: "default",
          background: visible ? "oklch(0.88 0.005 270)" : "oklch(0.93 0.005 270)",
          border: "1px solid oklch(0.82 0.008 270)",
          color: visible ? "oklch(0.30 0.01 270)" : "oklch(0.45 0.01 270)",
          fontSize: 10, fontWeight: 800, lineHeight: 1,
          transition: "background 0.15s ease, color 0.15s ease",
          userSelect: "none",
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
        }}
      >
        i
      </span>

      {/* Bubble — portaled to the body so the card's and the slide shell's
          overflow clipping can't cut it off. */}
      {anchor && bubbleStyle && createPortal(
        <span ref={bubbleRef} style={bubbleStyle}>
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
              background: "oklch(0.90 0.008 270)",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13,
              color: "#1e1c18",
              lineHeight: 1.55,
            }}>
              <span style={{ fontWeight: 700 }}>Exempel: </span>
              {example}
            </span>
          )}
        </span>,
        document.body,
      )}
    </span>
  );
}
