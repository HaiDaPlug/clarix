import { useEffect, useState } from "react";
import { CANVAS_H, CANVAS_W } from "../tokens";

const SCALE_PADDING_Y = 64;
const SCALE_MAX = 1.65;
const SCALE_MIN = 0.35;

export function useCardScale(
  containerRef: React.RefObject<HTMLDivElement | null>,
  viewportRef?: React.RefObject<HTMLDivElement | null>,
) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const availableWidth = container.clientWidth;
      const viewportHeight =
        viewportRef?.current?.clientHeight ?? window.innerHeight;
      const availableHeight = Math.max(0, viewportHeight - SCALE_PADDING_Y);
      const widthScale = availableWidth / CANVAS_W;
      const heightScale = availableHeight / CANVAS_H;
      const nextScale = Math.min(widthScale, heightScale, SCALE_MAX);

      setScale(Math.max(SCALE_MIN, nextScale));
    };

    const ro = new ResizeObserver(compute);
    ro.observe(container);

    const viewport = viewportRef?.current;
    if (viewport) ro.observe(viewport);

    window.addEventListener("resize", compute);
    compute();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [containerRef, viewportRef]);

  return { scale };
}
