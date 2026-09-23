// Numbers are written the way a Swedish reader expects them — "31 420", not
// "31.4K"; "62,4 %", not "62.4%" — and never abbreviated. The report already
// does this; the dashboard showing "14.8K" beside a report saying "14 800"
// reads as two products.
const LOCALE = "sv-SE";

function localized(value: number, maxDecimals: number): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: maxDecimals });
}

export function formatNumber(value: number, unit?: string): string {
  if (unit === "percent") return `${localized(value, 1)} %`;
  if (unit === "currency") return formatCurrency(value);
  if (unit === "seconds") return `${Math.round(value)} s`;
  return localized(value, Number.isInteger(value) ? 0 : 1);
}

// Small amounts (a cost per click) keep their öre; budgets are whole kronor.
// Exported so an animated counter rounds to the same precision it will print.
export function currencyDecimals(value: number): number {
  return Math.abs(value) < 100 ? 2 : 0;
}

export function formatCurrency(value: number, currency = "kr"): string {
  const decimals = currencyDecimals(value);
  const amount = localized(decimals ? value : Math.round(value), decimals);
  return `${amount} ${currency}`;
}

export function formatChange(
  current: number,
  previous: number
): { value: string; sign: "+" | "-" | ""; direction: "up" | "down" | "flat" } {
  if (!previous || previous === 0) return { value: "N/A", sign: "", direction: "flat" };
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const abs = Math.abs(delta);
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  const direction = delta > 1 ? "up" : delta < -1 ? "down" : "flat";
  return { value: `${localized(abs, 1)} %`, sign, direction };
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
