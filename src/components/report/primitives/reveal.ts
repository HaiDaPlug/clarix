"use client";

import { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

// Center-band trigger: only fires once content has scrolled into the
// vertical middle of the screen, not just poked over an edge — and since
// it's a percentage of the real viewport, it self-adjusts for fullscreen
// vs. windowed browsing instead of needing separate tuning per slide.
const REVEAL_MARGIN = "-32% 0px -32% 0px";

export const REVEAL_EASE = [0, 0, 0.2, 1] as const;

export function useSlideReveal() {
  const reduced = useReducedMotion() === true;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: REVEAL_MARGIN });
  const active = inView || reduced;
  return { ref, active, reduced };
}

export function fadeUp(
  active: boolean,
  reduced: boolean,
  opts?: { y?: number; duration?: number; delay?: number },
) {
  const y = opts?.y ?? 14;
  const duration = opts?.duration ?? 0.6;
  const delay = opts?.delay ?? 0;
  return {
    initial: reduced ? false : { opacity: 0, y },
    animate: { opacity: active ? 1 : 0, y: active ? 0 : (reduced ? 0 : y) },
    transition: { duration: reduced ? 0 : duration, ease: REVEAL_EASE, delay: reduced ? 0 : delay },
  };
}
