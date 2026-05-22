"use client";

import { motion, useReducedMotion } from "motion/react";
import { CANVAS_W, CANVAS_H } from "../tokens";

export function SlideCard({ slide, scale, innerRef }: {
  slide: { id: string; render: () => React.ReactNode };
  scale: number;
  innerRef?: React.RefCallback<HTMLDivElement>;
}) {
  const prefersReduced = useReducedMotion();
  const cardH = CANVAS_H * scale;
  const cardW = CANVAS_W * scale;

  return (
    <motion.div
      ref={innerRef}
      initial={prefersReduced ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.55, ease: [0, 0, 0.2, 1] }}
      style={{ height: cardH, width: cardW, flexShrink: 0 }}
      className="relative mx-auto print:shadow-none print:rounded-none"
    >
      {/* Clipping shell — sized to scaled dimensions */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 2px 4px rgba(20,18,16,0.04), 0 12px 40px rgba(20,18,16,0.08)",
          border: "1px solid rgba(20,18,16,0.05)",
        }}
      >
        {/* Canvas — full 1280×720, scaled down to fit */}
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            fontSize: 20,
          }}
          className="flex h-full flex-col justify-center px-16 py-12"
        >
          {slide.render()}
        </div>
      </div>
    </motion.div>
  );
}
