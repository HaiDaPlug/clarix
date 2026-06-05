import React from "react";
import { NUM_SPLIT, NUM_TEST, POS_TEST, NEG_TEST } from "./text";

export type HighlightTheme = "dark" | "light";

const THEME = {
  dark: {
    pos:     { color: "#6EF5A8", fontWeight: 700 } as React.CSSProperties,
    neg:     { color: "#FF8A80", fontWeight: 700 } as React.CSSProperties,
    neutral: { textDecoration: "underline", textUnderlineOffset: "3px", textDecorationColor: "rgba(255,255,255,0.45)", fontWeight: 600 } as React.CSSProperties,
  },
  light: {
    pos:     { color: "oklch(0.45 0.18 155)", fontWeight: 700 } as React.CSSProperties,
    neg:     { color: "oklch(0.5 0.2 22)",    fontWeight: 700 } as React.CSSProperties,
    neutral: { textDecoration: "underline", textUnderlineOffset: "3px", textDecorationColor: "rgba(0,0,0,0.3)", fontWeight: 600 } as React.CSSProperties,
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
