"use client";

import { useSearchParams } from "next/navigation";
import { currentCalendarMonthRange } from "./connected-sources";
import { isIsoDate } from "./date-range";

export type DatePresetId = "this-month" | "all-time";

export interface DatePreset {
  id: DatePresetId;
  labelSv: string;
  labelEn: string;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "this-month", labelSv: "Denna månad", labelEn: "This month" },
  { id: "all-time",   labelSv: "Sen start",   labelEn: "Since start" },
];

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function presetToRange(
  id: DatePresetId,
  today = new Date(),
): { startDate: string; endDate: string } {
  const y = today.getFullYear();
  const mo = today.getMonth();

  switch (id) {
    case "this-month":
      return currentCalendarMonthRange(today);

    case "all-time":
      return { startDate: "2020-01-01", endDate: toIso(today) };
  }
}

export function rangeFromSearchParams(
  params: URLSearchParams,
): { startDate: string; endDate: string } {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (isIsoDate(from) && isIsoDate(to) && from <= to) {
    return { startDate: from, endDate: to };
  }
  return currentCalendarMonthRange();
}

export function labelFromSearchParams(
  params: URLSearchParams,
  locale: string,
): string {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return locale === "sv" ? "Denna månad" : "This month";
  }
  // Try to match a preset
  const today = new Date();
  for (const preset of DATE_PRESETS) {
    const r = presetToRange(preset.id, today);
    if (r.startDate === from && r.endDate === to) {
      return locale === "sv" ? preset.labelSv : preset.labelEn;
    }
  }
  // Custom range — show dates
  return `${from} – ${to}`;
}

export function useDateRange(): { startDate: string; endDate: string } {
  const params = useSearchParams();
  return rangeFromSearchParams(params);
}
