"use client";

import { motion } from "motion/react";
import { Eyebrow } from "./Eyebrow";
import { Rule } from "./Rule";
import { cn } from "@/lib/utils";

interface SlideHeaderProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  className?: string;
  headlineSize?: "xl" | "2xl" | "3xl" | "4xl";
}

const headlineSizes = {
  xl: "text-3xl md:text-4xl",
  "2xl": "text-4xl md:text-5xl",
  "3xl": "text-5xl md:text-6xl",
  "4xl": "text-6xl md:text-7xl",
};

export function SlideHeader({
  eyebrow,
  headline,
  subheadline,
  className,
  headlineSize = "2xl",
}: SlideHeaderProps) {
  return (
    <motion.div
      className={cn("mb-10 md:mb-14", className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "font-display leading-[1.06] tracking-[-0.02em] text-[var(--charcoal)] mb-0",
          headlineSizes[headlineSize]
        )}
      >
        {headline}
      </h2>
      {subheadline && (
        <p className="mt-4 text-[var(--slate)] text-base leading-relaxed max-w-2xl">
          {subheadline}
        </p>
      )}
      <Rule className="mt-8" />
    </motion.div>
  );
}
