"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  value,
  duration = 1000,
  format = (n: number) => n.toLocaleString(),
  animate = true,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  animate?: boolean;
}) {
  const [display, setDisplay] = useState(animate ? 0 : value);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, animate]);

  return <span>{format(Math.round(display))}</span>;
}
