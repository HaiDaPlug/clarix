import type { DateRange } from "./report-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && toIsoDate(date) === value;
}

export function assertDateRange(range: DateRange): DateRange {
  if (!isIsoDate(range.startDate) || !isIsoDate(range.endDate)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }

  if (dateToUtcMs(range.startDate) > dateToUtcMs(range.endDate)) {
    throw new Error("startDate must be before or equal to endDate.");
  }

  return range;
}

export function getPriorDateRange(range: DateRange): DateRange {
  assertDateRange(range);

  const startMs = dateToUtcMs(range.startDate);
  const endMs = dateToUtcMs(range.endDate);
  const inclusiveDays = Math.round((endMs - startMs) / dayMs()) + 1;
  const priorEnd = new Date(startMs - dayMs());
  const priorStart = new Date(priorEnd.getTime() - (inclusiveDays - 1) * dayMs());

  return {
    startDate: toIsoDate(priorStart),
    endDate: toIsoDate(priorEnd),
  };
}

export function formatPeriod(range: DateRange): string {
  return `${range.startDate} - ${range.endDate}`;
}

export function gscCoverageForRange(endDate: string, today = new Date()): number {
  if (!isIsoDate(endDate)) return 1;

  const endMs = dateToUtcMs(endDate);
  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const daysOld = Math.floor((todayMs - endMs) / dayMs());

  if (daysOld < 0) return 0.9;
  if (daysOld >= 3) return 1;

  return round(Math.max(0, (daysOld + 1) / 4));
}

function dateToUtcMs(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayMs(): number {
  return 24 * 60 * 60 * 1000;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
