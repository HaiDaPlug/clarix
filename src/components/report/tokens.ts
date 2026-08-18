// AI insight gradient — matches the landing page aurora purple palette
// Used on DashboardHero, AISummary (report slides), NextStepsCard, landing AI section.
export const AI_GRADIENT       = "linear-gradient(135deg, oklch(0.97 0.04 300) 0%, oklch(0.96 0.05 260) 50%, oklch(0.97 0.04 350) 100%)";
export const AI_SHADOW         = "0_30px_80px_-30px_rgba(139,92,246,0.4)";
export const AI_TEXT_PRIMARY   = "oklch(0.2 0.04 290)";
export const AI_TEXT_SECONDARY = "oklch(0.45 0.18 290)";
export const AI_BORDER         = "oklch(0.78 0.06 295 / 0.5)";
export const AI_SHIMMER        = "oklch(0.85 0.16 300 / 0.2)";

export const TREND_POS = "oklch(0.7 0.16 155)";
export const TREND_NEG = "oklch(0.62 0.22 22)";
export const TREND_POS_BG = "oklch(0.7 0.16 155 / 0.14)";
export const TREND_NEG_BG = "oklch(0.62 0.22 22 / 0.14)";
export const ACCENT = "oklch(0.5 0.18 290)";

// 16:9. A 16:10 canvas was tried to close the fullscreen height gap on
// MacBooks, but windowed mode is height-bound: a taller canvas spends the
// height budget and forces the card narrower (87% vs 97% of window width on a
// 16" MacBook), which reads as timid. The fullscreen height gap is better
// closed by slides that fill their canvas than by reshaping the canvas.
export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// Gap between stacked slide cards, at scale 1. Callers multiply by the live
// card scale (see slideGap) so the rhythm between cards stays proportional to
// the cards themselves instead of swallowing a small card or stranding a
// large one.
export const SLIDE_GAP = 120;

/** Vertical gap between slide cards for a given card scale. */
export function slideGap(scale: number) {
  return SLIDE_GAP * scale;
}

// Room the scroll content leaves at its bottom for the fixed KeyboardHints
// bar: badge height + the bar's bottom offset + clear space above it, so the
// hints sit off the viewport edge intentionally rather than crowding it.
export const HINTS_BAR_SPACE = 104;
