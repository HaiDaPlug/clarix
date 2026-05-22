import { useEffect, useState } from "react";
import { CANVAS_W } from "../tokens";

export function useCardScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = (w: number) => {
      setScale(Math.min(w / CANVAS_W, 1.2) * 0.90);
    };
    const ro = new ResizeObserver(([entry]) => compute(entry.contentRect.width));
    ro.observe(el);
    compute(el.clientWidth);
    return () => ro.disconnect();
  }, [containerRef]);

  return { scale };
}
