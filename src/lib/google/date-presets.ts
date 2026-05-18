"use client";

import { useSearchParams } from "next/navigation";
import { currentCalendarMonthRange } from "./connected-sources";
import { isIsoDate } from "./date-range";

export type DatePresetId = "this-month" | "last-month" | "last-30" | "last-90";

export interface DatePreset {
  id: DatePresetId;
  labelSv: string;
  labelEn: string;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "this-month", labelSv: "Denna månad",       labelEn: "This month" },
  { id: "last-month", labelSv: "Förra månaden",      labelEn: "Last month" },
  { id: "last-30",    labelSv: "Senaste 30 dagarna", labelEn: "Last 30 days" },
  { id: "last-90",    labelSv: "Senaste 90 dagarna", labelEn: "Last 90 days" },
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

    case "last-month": {
      const firstOfLast = new Date(y, mo - 1, 1);
      const lastOfLast = new Date(y, mo, 0);
      return { startDate: toIso(firstOfLast), endDate: toIso(lastOfLast) };
    }

    case "last-30": {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { startDate: toIso(start), endDate: toIso(today) };
    }

    case "last-90": {
      const start = new Date(today);
      start.setDate(today.getDate() - 89);
      return { startDate: toIso(start), endDate: toIso(today) };
    }
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
