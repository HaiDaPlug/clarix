"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DATE_PRESETS,
  DatePresetId,
  labelFromSearchParams,
  presetToRange,
} from "@/lib/google/date-presets";

interface DateRangePickerProps {
  locale?: string;
}

const MONTH_SV = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
const DAY_SV   = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTH_SV[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  // 0=Mon … 6=Sun (ISO weekday order)
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

interface CalendarGridProps {
  year: number;
  month: number;
  selecting: string | null;   // first picked date, awaiting second
  hovered: string | null;
  rangeFrom: string | null;
  rangeTo: string | null;
  today: string;
  onDay: (iso: string) => void;
  onHover: (iso: string | null) => void;
}

function CalendarGrid({
  year, month, selecting, hovered,
  rangeFrom, rangeTo, today, onDay, onHover,
}: CalendarGridProps) {
  const totalDays = daysInMonth(year, month);
  const startOffset = firstWeekdayOfMonth(year, month);

  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) =>
      `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];

  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const lo = selecting
    ? [selecting, hovered].filter(Boolean).sort()[0]!
    : rangeFrom;
  const hi = selecting
    ? [selecting, hovered].filter(Boolean).sort()[1]!
    : rangeTo;

  return (
    <div>
      <div style={{ textAlign: "center", fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--charcoal)" }}>
        {MONTH_SV[month]} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 32px)", gap: "2px 0" }}>
        {DAY_SV.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 500, color: "var(--slate)", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`empty-${i}`} />;

          const isToday = iso === today;
          const isStart = iso === (selecting ?? rangeFrom);
          const isEnd   = !selecting && iso === rangeTo;
          const inRange = lo && hi && iso > lo && iso < hi;
          const isEdge  = iso === lo || iso === hi;
          const isFuture = iso > today;

          return (
            <button
              key={iso}
              disabled={isFuture}
              onClick={() => onDay(iso)}
              onMouseEnter={() => onHover(iso)}
              onMouseLeave={() => onHover(null)}
              style={{
                height: 32,
                width: 32,
                borderRadius: isEdge ? 8 : inRange ? 0 : 8,
                border: "none",
                cursor: isFuture ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: isEdge ? 700 : isToday ? 600 : 400,
                color: isEdge
                  ? "#fff"
                  : isFuture
                  ? "var(--rule)"
                  : inRange
                  ? "oklch(0.45 0.18 290)"
                  : isToday
                  ? "oklch(0.5 0.18 290)"
                  : "var(--charcoal)",
                backgroundColor: isEdge
                  ? "oklch(0.5 0.18 290)"
                  : inRange
                  ? "oklch(0.94 0.06 290)"
                  : "transparent",
                outline: isToday && !isEdge ? "1px solid oklch(0.7 0.12 290)" : "none",
                transition: "background-color 0.1s",
              }}
            >
              {parseInt(iso.slice(8), 10)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ locale = "sv" }: DateRangePickerProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = toIso(new Date());

  // Calendar navigation state — default: show current + previous month
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Range selection state
  const [selecting, setSelecting] = useState<string | null>(null); // first click
  const [hovered, setHovered] = useState<string | null>(null);

  const fromParam = params.get("from") ?? "";
  const toParam   = params.get("to")   ?? "";

  const activePresetId = DATE_PRESETS.find((p) => {
    const r = presetToRange(p.id, new Date());
    return r.startDate === fromParam && r.endDate === toParam;
  })?.id ?? (!fromParam && !toParam ? "this-month" : null);

  // What to show in the calendar as the current selection
  const displayFrom = fromParam || presetToRange("this-month").startDate;
  const displayTo   = toParam   || presetToRange("this-month").endDate;

  const currentLabel = labelFromSearchParams(params, locale);

  function applyRange(from: string, to: string) {
    const next = new URLSearchParams(params.toString());
    next.set("from", from);
    next.set("to", to);
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  function selectPreset(id: DatePresetId) {
    const range = presetToRange(id);
    applyRange(range.startDate, range.endDate);
    setSelecting(null);
    setOpen(false);
  }

  function handleDay(iso: string) {
    if (!selecting) {
      setSelecting(iso);
    } else {
      const [from, to] = [selecting, iso].sort();
      applyRange(from, to);
      setSelecting(null);
      setOpen(false);
    }
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    const nextM = calMonth === 11 ? 0 : calMonth + 1;
    const nextY = calMonth === 11 ? calYear + 1 : calYear;
    // Don't navigate past current month
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth())) return;
    setCalYear(nextY);
    setCalMonth(nextM);
  }

  // Second month shown alongside
  const month2 = calMonth === 11 ? 0 : calMonth + 1;
  const year2  = calMonth === 11 ? calYear + 1 : calYear;

  // Is the second month still <= current?
  const canShowSecond = year2 < now.getFullYear() || (year2 === now.getFullYear() && month2 <= now.getMonth());
  // Can we go forward?
  const atCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelecting(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)]"
        style={{
          border: "1px solid var(--rule)",
          color: "var(--charcoal)",
          backgroundColor: open ? "var(--bone-dark)" : "var(--bone)",
        }}
      >
        <Calendar className="h-4 w-4" style={{ color: "var(--slate)" }} />
        {currentLabel}
        <ChevronDown
          className="h-3.5 w-3.5"
          style={{
            color: "var(--slate)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "#fff",
            border: "1px solid var(--rule)",
            borderRadius: 16,
            boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.12)",
            padding: "12px",
            zIndex: 50,
            display: "flex",
            gap: 0,
          }}
        >
          {/* Preset list */}
          <div style={{ paddingRight: 12, borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", gap: 2, justifyContent: "center" }}>
            {DATE_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              const label = locale === "sv" ? preset.labelSv : preset.labelEn;
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset.id)}
                  className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors"
                  style={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--charcoal)" : "var(--slate)",
                    backgroundColor: isActive ? "var(--bone)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bone)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  {label}
                  {isActive && (
                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.5 0.18 290)" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar panel */}
          <div style={{ paddingLeft: 12 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button
                onClick={prevMonth}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "var(--slate)" }}
                className="hover:bg-[var(--bone)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>
                {selecting ? (
                  <span style={{ fontWeight: 600, color: "oklch(0.5 0.18 290)" }}>
                    Välj slutdatum
                  </span>
                ) : (
                  <span style={{ color: "var(--charcoal)", fontWeight: 500 }}>
                    {formatDisplay(displayFrom)} – {formatDisplay(displayTo)}
                  </span>
                )}
              </div>
              <button
                onClick={nextMonth}
                disabled={atCurrentMonth && !canShowSecond}
                style={{
                  border: "none", background: "none",
                  cursor: atCurrentMonth ? "not-allowed" : "pointer",
                  padding: 4, borderRadius: 6,
                  color: atCurrentMonth ? "var(--rule)" : "var(--slate)",
                  opacity: atCurrentMonth ? 0.4 : 1,
                }}
                className={atCurrentMonth ? "" : "hover:bg-[var(--bone)]"}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Two-month grid */}
            <div style={{ display: "flex", gap: 24 }}>
              <CalendarGrid
                year={calYear}
                month={calMonth}
                selecting={selecting}
                hovered={hovered}
                rangeFrom={displayFrom}
                rangeTo={displayTo}
                today={today}
                onDay={handleDay}
                onHover={setHovered}
              />
              {canShowSecond && (
                <CalendarGrid
                  year={year2}
                  month={month2}
                  selecting={selecting}
                  hovered={hovered}
                  rangeFrom={displayFrom}
                  rangeTo={displayTo}
                  today={today}
                  onDay={handleDay}
                  onHover={setHovered}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
