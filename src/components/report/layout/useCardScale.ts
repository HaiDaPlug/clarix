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

// Vertical counterpart, and the reason the deck can sit centered. The stack's
// SLIDE_GAP padding can't supply this breathing room: on a height-bound screen
// a card scaled to the full viewport height leaves zero slack, so the top pad
// pushes the first card down and crops its bottom — you land on the upper half
// of slide one. Reserving a little height instead lets every card sit fully
// inside the viewport with its shadow and corners visible, and gives the deck
// real slack to center into. Deliberately small: the card should still own the
// screen.
const INSET_Y = 0.03;

// Headroom for large monitors. At 1.65 a 1440p screen was cap-bound rather
// than viewport-bound — the screen had room and the code refused it. 2.2 lets
// 4K/5K fill properly while still bounding runaway type on ultrawides.
const SCALE_MAX = 2.2;
const SCALE_MIN = 0.35;

/**
 * Fits the fixed CANVAS_W x CANVAS_H slide into the live viewport box.
 *
 * Both axes are measured the same honest way: the container's own width and
 * the scroll viewport's own height, each minus its inset. Nothing else is
 * reserved here — what needs room (the hints bar) takes it as real layout
 * padding on the scroll content instead of silently shrinking every slide on
 * every screen.
 *
 * Also returns `edgePad`: the leftover height on one side of a card. Used as
 * the stack's top padding, it lands the reader on slide one centered in the
 * viewport rather than scrolled to its top edge.
 *
 * Fullscreen needs no special case: entering it grows the scroll viewport,
 * the ResizeObserver fires, and the slide grows with it.
 */
export function useCardScale(
  containerRef: React.RefObject<HTMLDivElement | null>,
  viewportRef?: React.RefObject<HTMLDivElement | null>,
) {
  const [fit, setFit] = useState({ scale: 1, edgePad: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const viewportHeight =
        viewportRef?.current?.clientHeight ?? window.innerHeight;

      const availableWidth = container.clientWidth * (1 - INSET_X * 2);
      const availableHeight = viewportHeight * (1 - INSET_Y * 2);

      const widthScale = availableWidth / CANVAS_W;
      const heightScale = availableHeight / CANVAS_H;
      const nextScale = Math.max(
        SCALE_MIN,
        Math.min(widthScale, heightScale, SCALE_MAX),
      );

      // Clamped at 0: on a viewport too short for SCALE_MIN the card is taller
      // than the screen, and negative padding would pull it off the top.
      const nextEdgePad = Math.max(0, (viewportHeight - CANVAS_H * nextScale) / 2);

      setFit((prev) =>
        prev.scale === nextScale && prev.edgePad === nextEdgePad
          ? prev
          : { scale: nextScale, edgePad: nextEdgePad },
      );
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

  return fit;
}
