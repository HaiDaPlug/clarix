"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Check, ChevronDown } from "lucide-react";
import {
  DATE_PRESETS,
  DatePresetId,
  labelFromSearchParams,
  presetToRange,
} from "@/lib/google/date-presets";

interface DateRangePickerProps {
  locale?: string;
}

export function DateRangePicker({ locale = "sv" }: DateRangePickerProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel = labelFromSearchParams(params, locale);

  // Derive which preset is active (if any)
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const today = new Date();
  const activePresetId = DATE_PRESETS.find((p) => {
    const r = presetToRange(p.id, today);
    return r.startDate === from && r.endDate === to;
  })?.id ?? (!from && !to ? "this-month" : null);

  const select = (id: DatePresetId) => {
    const range = presetToRange(id);
    const next = new URLSearchParams(params.toString());
    next.set("from", range.startDate);
    next.set("to", range.endDate);
    router.replace(`?${next.toString()}`, { scroll: false });
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
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
            minWidth: 210,
            background: "#fff",
            border: "1px solid var(--rule)",
            borderRadius: 12,
            boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.10)",
            padding: "6px",
            zIndex: 50,
          }}
        >
          {DATE_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            const label = locale === "sv" ? preset.labelSv : preset.labelEn;
            return (
              <button
                key={preset.id}
                onClick={() => select(preset.id)}
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
      )}
    </div>
  );
}
