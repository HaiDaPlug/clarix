import { useEffect, useState } from "react";
import { CANVAS_H, CANVAS_W } from "../tokens";

// Side gutter as a fraction of container width, so the frame reads the same on
// a 13" laptop and a 32" monitor — a fixed px gutter eats a visible share of a
// small screen and disappears on a large one. Deliberately minimal: width is
// the binding axis on wide screens and windowed laptops, where every gutter
// pixel is card size given away, and a timid card is the thing this deck was
// getting wrong. Enough to keep the card's shadow off the viewport edge.
//
// There is no matching vertical inset: height is the binding axis in
// fullscreen, and the SLIDE_GAP padding above and below the stack already
// supplies the visual breathing room an inset would.
const INSET_X = 0.005;

// Headroom for large monitors. At 1.65 a 1440p screen was cap-bound rather
// than viewport-bound — the screen had room and the code refused it. 2.2 lets
// 4K/5K fill properly while still bounding runaway type on ultrawides.
const SCALE_MAX = 2.2;
const SCALE_MIN = 0.35;

/**
 * Fits the fixed CANVAS_W x CANVAS_H slide into the live viewport box.
 *
 * Both axes are measured the same honest way: the container's own width and
 * the scroll viewport's own height. There are no bonuses or reserves —
 * anything that needs room (the hints bar) reserves it as real layout padding
 * on the scroll content instead of silently shrinking every slide on every
 * screen.
 *
 * Fullscreen needs no special case: entering it grows the scroll viewport,
 * the ResizeObserver fires, and the slide grows with it.
 */
export function useCardScale(
  containerRef: React.RefObject<HTMLDivElement | null>,
  viewportRef?: React.RefObject<HTMLDivElement | null>,
) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const viewportHeight =
        viewportRef?.current?.clientHeight ?? window.innerHeight;

      const availableWidth = container.clientWidth * (1 - INSET_X * 2);
      const availableHeight = viewportHeight;

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
