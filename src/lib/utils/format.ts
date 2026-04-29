export function formatNumber(value: number, unit?: string): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "currency") return formatCurrency(value);
  if (unit === "seconds") return `${value.toFixed(0)}s`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("sv-SE");
}

export function formatCurrency(value: number, currency = "SEK"): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${currency}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ${currency}`;
  return `${value.toLocaleString("sv-SE")} ${currency}`;
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
  return { value: `${abs.toFixed(1)}%`, sign, direction };
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
