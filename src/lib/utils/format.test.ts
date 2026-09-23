import { describe, expect, it } from "vitest";
import { currencyDecimals, formatCurrency } from "./format";

// sv-SE groups with a narrow no-break space; compare on plain spaces.
const plain = (s: string) => s.replace(/\s/g, " ");

describe("formatCurrency", () => {
  it("keeps öre on small amounts such as a cost per lead", () => {
    expect(plain(formatCurrency(4.33))).toBe("4,33 kr");
  });

  it("writes budgets as whole kronor", () => {
    expect(plain(formatCurrency(48_512.4))).toBe("48 512 kr");
  });

  it("gives a counter the same precision the formatter prints", () => {
    // A ticker rounding to 0 decimals first would turn 4,33 kr into "4 kr".
    expect(currencyDecimals(4.33)).toBe(2);
    expect(currencyDecimals(48_512.4)).toBe(0);
    const ticked = Number((4.33).toFixed(currencyDecimals(4.33)));
    expect(plain(formatCurrency(ticked))).toBe("4,33 kr");
  });
});
