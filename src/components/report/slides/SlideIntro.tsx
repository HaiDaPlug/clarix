"use client";

import { useState } from "react";
import { type SlideData } from "../slide-data";

function Sparkline() {
  // Fixed decorative bezier — not data-driven.
  // Canvas is 1280×720; SVG anchored to canvas top-left (py-12=48px, px-16=64px padding).
  // Curve: nearly flat along the bottom-left, sweeps up to exit top-right corner.
  const W = 1460;
  const H = 720;
  const line = `M 0 ${H} C 620 ${H} 960 190 ${W} -40`;
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
          <stop offset="0%"   stopColor="rgb(175,182,198)" stopOpacity="0.75" />
          <stop offset="65%"  stopColor="rgb(200,205,215)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="rgb(255,255,255)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#intro-spark-grad)" />
      <path d={line} stroke="rgba(26,23,20,0.38)" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function SlideIntro({ d }: { d: SlideData }) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  const name = d.clientName ?? "Din webbplats";
  const showFavicon = !!d.clientDomain && !faviconFailed;
  const meta = [d.clientDomain, d.period].filter(Boolean).join("  ·  ");

  return (
    <div className="relative h-full flex flex-col">
      {/* Favicon — top-right, absolute */}
      {showFavicon && (
        <img
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
      <h1
        className="font-display"
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
      </h1>

      {/* Subtext */}
      <p
        style={{
          fontSize: 20,
          color: "#1a1714",
          fontWeight: 500,
          margin: "16px 0 0",
          lineHeight: 1.4,
        }}
      >
        Trafikrapport från föregående period.
      </p>

      {/* Domain · period */}
      {meta && (
        <p
          style={{
            fontSize: 14,
            color: "#1a1714",
            fontWeight: 500,
            margin: "20px 0 0",
            letterSpacing: "0.01em",
          }}
        >
          {meta}
        </p>
      )}

      {/* Sparkline — fixed decorative bezier, bleeds outside slide at bottom-right */}
      <Sparkline />
    </div>
  );
}
