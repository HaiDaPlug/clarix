import { describe, it, expect } from "vitest";
import { isValidElement } from "react";
import { highlightNumbers } from "./highlight-numbers";

// Classify each rendered part by which style bucket it landed in. We only need
// to distinguish pos (green color) / neg (red color) / neutral (amber bg) /
// plain text, so we inspect the style object the component applied.
function classify(node: React.ReactNode): "pos" | "neg" | "neutral" | "text" {
  if (!isValidElement(node)) return "text";
  const style = (node.props as { style?: React.CSSProperties }).style ?? {};
  if (style.background) return "neutral";
  if (style.color) {
    // Green pos uses an oklch hue ~155; neg is red (#FF8A80 or oklch hue ~22).
    return String(style.color).includes("155") ? "pos" : "neg";
  }
  return "text";
}

function buckets(text: string) {
  return highlightNumbers(text, "light").map(classify);
}

describe("highlightNumbers", () => {
  it("colors a +signed delta as positive (green)", () => {
    expect(buckets("ökade med +3,5 %")).toContain("pos");
  });

  it("colors an ASCII -signed delta as negative (red)", () => {
    expect(buckets("föll med -9 %")).toContain("neg");
  });

  it("colors a Unicode minus − delta as negative (red)", () => {
    // Regression: U+2212 is what the model emits; it must read as negative, not neutral.
    expect(buckets("en nedgång på −9 %")).toContain("neg");
    expect(buckets("en nedgång på −9 %")).not.toContain("neutral");
  });

  it("highlights an unsigned absolute count as neutral (amber), never colored", () => {
    const b = buckets("2 656 besök");
    expect(b).toContain("neutral");
    expect(b).not.toContain("pos");
    expect(b).not.toContain("neg");
  });

  it("leaves non-numeric text untouched", () => {
    expect(buckets("inga siffror här")).toEqual(["text"]);
  });
});
