import React from "react";
import { NUM_SPLIT, NUM_TEST, POS_TEST, NEG_TEST } from "./text";

export type HighlightTheme = "dark" | "light";

// Neutral numbers (plain counts, unsigned figures) get a translucent amber
// highlighter so they pop without competing with the green/red of signed
// deltas. Signed deltas (+3,5 % / −9 %) carry direction via color instead.
const NEUTRAL_HIGHLIGHT: React.CSSProperties = {
  background: "rgba(255, 214, 64, 0.32)",
  borderRadius: "0.3em",
  padding: "0 0.22em",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
  fontWeight: 600,
};

const THEME = {
  dark: {
    pos:     { color: "oklch(0.7 0.16 155)", fontWeight: 700 } as React.CSSProperties,
    neg:     { color: "#FF8A80", fontWeight: 700 } as React.CSSProperties,
    neutral: NEUTRAL_HIGHLIGHT,
  },
  light: {
    pos:     { color: "oklch(0.7 0.16 155)", fontWeight: 700 } as React.CSSProperties,
    neg:     { color: "oklch(0.5 0.2 22)",    fontWeight: 700 } as React.CSSProperties,
    neutral: NEUTRAL_HIGHLIGHT,
  },
};

export function highlightNumbers(
  text: string,
  theme: HighlightTheme = "dark",
): React.ReactNode[] {
  const styles = THEME[theme];
  // Reset lastIndex before each call — split() on a /g regex is stateful.
  NUM_SPLIT.lastIndex = 0;
  return text.split(NUM_SPLIT).map((part, i) => {
    if (!NUM_TEST.test(part)) return part;
    if (POS_TEST.test(part)) return <span key={i} style={styles.pos}>{part}</span>;
    if (NEG_TEST.test(part)) return <span key={i} style={styles.neg}>{part}</span>;
    return <span key={i} style={styles.neutral}>{part}</span>;
  });
}
