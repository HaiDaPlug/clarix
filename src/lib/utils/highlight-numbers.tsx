import React from "react";
import { NUM_SPLIT, NUM_TEST, POS_TEST, NEG_TEST } from "./text";

export type HighlightTheme = "dark" | "light";

/**
 * How much of the copy to light up.
 *  - "all": every number gets a treatment — signed deltas in colour, plain
 *    counts on the amber highlighter. For the one sentence that carries the
 *    conclusion.
 *  - "signed": only signed deltas are coloured; plain counts are set
 *    semibold with no highlighter. For supporting copy, so the reader's eye
 *    is not pulled to every incidental figure.
 */
export type HighlightEmphasis = "all" | "signed";

// A number and its unit ("+24 %", "48 500 kr") must never break across lines.
const KEEP_TOGETHER: React.CSSProperties = { whiteSpace: "nowrap" };

// Neutral numbers (plain counts, unsigned figures) get a translucent amber
// highlighter so they pop without competing with the green/red of signed
// deltas. Signed deltas (+3,5 % / −9 %) carry direction via color instead.
const NEUTRAL_HIGHLIGHT: React.CSSProperties = {
  ...KEEP_TOGETHER,
  background: "rgba(255, 214, 64, 0.32)",
  borderRadius: "0.3em",
  padding: "0.05em 0.12em",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
  fontWeight: 600,
};

const NEUTRAL_QUIET: React.CSSProperties = { ...KEEP_TOGETHER, fontWeight: 600 };

const THEME = {
  dark: {
    pos:     { ...KEEP_TOGETHER, color: "oklch(0.7 0.16 155)", fontWeight: 700 } as React.CSSProperties,
    neg:     { ...KEEP_TOGETHER, color: "#FF8A80", fontWeight: 700 } as React.CSSProperties,
    neutral: NEUTRAL_HIGHLIGHT,
  },
  light: {
    pos:     { ...KEEP_TOGETHER, color: "oklch(0.7 0.16 155)", fontWeight: 700 } as React.CSSProperties,
    neg:     { ...KEEP_TOGETHER, color: "oklch(0.62 0.22 22)",   fontWeight: 700 } as React.CSSProperties,
    neutral: NEUTRAL_HIGHLIGHT,
  },
};

export function highlightNumbers(
  text: string,
  theme: HighlightTheme = "dark",
  emphasis: HighlightEmphasis = "all",
): React.ReactNode[] {
  const styles = THEME[theme];
  const neutral = emphasis === "all" ? styles.neutral : NEUTRAL_QUIET;
  // Reset lastIndex before each call — split() on a /g regex is stateful.
  NUM_SPLIT.lastIndex = 0;
  return text.split(NUM_SPLIT).map((part, i) => {
    if (!NUM_TEST.test(part)) return part;
    if (POS_TEST.test(part)) return <span key={i} style={styles.pos}>{part}</span>;
    if (NEG_TEST.test(part)) return <span key={i} style={styles.neg}>{part}</span>;
    return <span key={i} style={neutral}>{part}</span>;
  });
}
