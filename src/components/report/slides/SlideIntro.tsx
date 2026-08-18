"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CANVAS_H } from "../tokens";
import { type SlideData } from "../slide-data";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

function Sparkline() {
  // Fixed decorative bezier — not data-driven.
  // SVG anchored to canvas top-left (py-12=48px, px-16=64px padding), sized to
  // the canvas so the curve keeps sweeping corner to corner on any ratio.
  // Curve: nearly flat along the bottom-left, sweeps up to exit top-right corner.
  const W = 1460;
  const H = CANVAS_H;
  const line = `M 0 ${H} C 800 ${H} 1080 210 ${W} -40`;
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        position: "absolute",
        top: -48,
        left: -64,
        pointerEvents: "none",
        zIndex: -1,
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id="intro-spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FF6B55" stopOpacity="0.18" />
          <stop offset="60%"  stopColor="#FF6B55" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FF6B55" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="intro-spark-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#FF4D9E" />
          <stop offset="50%"  stopColor="#FF6B55" />
          <stop offset="100%" stopColor="#FFB830" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#intro-spark-grad)" />
      <path d={line} stroke="url(#intro-spark-stroke)" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

export function SlideIntro({ d }: { d: SlideData }) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const { ref, active, reduced } = useSlideReveal();

  const name = d.clientName ?? "Din webbplats";
  const showFavicon = !!d.clientDomain && !faviconFailed;
  const meta = [d.clientDomain, d.period].filter(Boolean).join("  ·  ");

  return (
    <div ref={ref} className="relative h-full flex flex-col">
      {/* Favicon — top-right, absolute */}
      {showFavicon && (
        <motion.img
          {...fadeUp(active, reduced, { y: 8 })}
          src={`/api/favicon?domain=${d.clientDomain}`}
          alt=""
          width={72}
          height={72}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            borderRadius: 16,
            display: "block",
          }}
          onError={() => setFaviconFailed(true)}
        />
      )}

      {/* Property name */}
      <motion.h1
        className="font-display"
        {...fadeUp(active, reduced)}
        style={{
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.0,
          letterSpacing: "-0.03em",
          color: "#1a1714",
          margin: 0,
          maxWidth: 860,
        }}
      >
        {name}
        <span style={{ color: "#FF6B55" }}>.</span>
      </motion.h1>

      {/* Subtext */}
      <motion.p
        {...fadeUp(active, reduced, { delay: 0.1 })}
        style={{
          fontSize: 20,
          color: "#1a1714",
          fontWeight: 500,
          margin: "16px 0 0",
          lineHeight: 1.4,
        }}
      >
        Trafikrapport från föregående period.
      </motion.p>

      {/* Domain · period */}
      {meta && (
        <motion.p
          {...fadeUp(active, reduced, { delay: 0.18 })}
          style={{
            fontSize: 14,
            color: "#1a1714",
            fontWeight: 500,
            margin: "20px 0 0",
            letterSpacing: "0.01em",
          }}
        >
          {meta}
        </motion.p>
      )}

      {/* Sparkline — fixed decorative bezier, bleeds outside slide at bottom-right */}
      <Sparkline />
    </div>
  );
}
