"use client";

import { useSearchParams } from "next/navigation";
import { currentCalendarMonthRange, lastCompletedDay } from "./connected-sources";
import { isIsoDate } from "./date-range";

export type DatePresetId =
  | "this-month"
  | "last-3-months"
  | "last-6-months"
  | "last-12-months"
  | "all-time";

export interface DatePreset {
  id: DatePresetId;
  labelSv: string;
  labelEn: string;
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "this-month",     labelSv: "Denna månad",         labelEn: "This month" },
  { id: "last-3-months",  labelSv: "Senaste 3 månaderna", labelEn: "Last 3 months" },
  { id: "last-6-months",  labelSv: "Senaste 6 månaderna", labelEn: "Last 6 months" },
  { id: "last-12-months", labelSv: "Senaste året",        labelEn: "Last 12 months" },
  { id: "all-time",       labelSv: "Sen start",           labelEn: "Since start" },
];

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Shift by whole months, clamping the day to the target month's length so
// e.g. 31 Mar minus one month lands on 28/29 Feb rather than rolling into March.
function addMonths(date: Date, delta: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setMonth(d.getMonth() + delta);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
}

// Rolling window ending on the last completed day. The start is pushed one day
// forward so the window is inclusive on both ends and spans exactly `months`.
function rollingMonths(months: number, today: Date): { startDate: string; endDate: string } {
  const end = lastCompletedDay(today);
  const start = addMonths(end, -months);
  start.setDate(start.getDate() + 1);
  return { startDate: toIso(start), endDate: toIso(end) };
}

export function presetToRange(
  id: DatePresetId,
  today = new Date(),
): { startDate: string; endDate: string } {
  switch (id) {
    case "this-month":
      return currentCalendarMonthRange(today);

    case "last-3-months":
      return rollingMonths(3, today);

    case "last-6-months":
      return rollingMonths(6, today);

    case "last-12-months":
      return rollingMonths(12, today);

    case "all-time":
      return { startDate: "2020-01-01", endDate: toIso(lastCompletedDay(today)) };
  }
}

export function rangeFromSearchParams(
  params: URLSearchParams,
): { startDate: string; endDate: string } {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const yesterday = toIso(lastCompletedDay());
  if (isIsoDate(from) && isIsoDate(to) && from <= to) {
    // Clamp endDate to yesterday so partial-day data is excluded
    const clampedTo = to > yesterday ? yesterday : to;
    if (from <= clampedTo) {
      return { startDate: from, endDate: clampedTo };
    }
  }
  return currentCalendarMonthRange();
}

export function labelFromSearchParams(
  params: URLSearchParams,
  locale: string,
): string {
  // Use the clamped effective range so the label always matches what the data fetches.
  const { startDate, endDate } = rangeFromSearchParams(params);
  const today = new Date();
  for (const preset of DATE_PRESETS) {
    const r = presetToRange(preset.id, today);
    if (r.startDate === startDate && r.endDate === endDate) {
      return locale === "sv" ? preset.labelSv : preset.labelEn;
    }
  }
  return `${startDate} – ${endDate}`;
}

export function useDateRange(): { startDate: string; endDate: string } {
  const params = useSearchParams();
  return rangeFromSearchParams(params);
}
