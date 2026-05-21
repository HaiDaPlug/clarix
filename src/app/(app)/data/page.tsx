"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { motion } from "motion/react";
import { createClient } from "@/utils/supabase/client";
import { useDateRange } from "@/lib/google/date-presets";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import { useLocale } from "@/lib/i18n";
import type { Ga4ExplorerData, Ga4ExplorerMetric, Ga4ExplorerRow } from "@/app/api/ga4-explorer/route";

// ─── Card definitions ─────────────────────────────────────────────────────────

type CardDef = {
  id: string;
  label: string;
  accent: string;
  kind: "metrics" | "rows";
  rowValueLabel?: string;
};

const CARD_DEFS: CardDef[] = [
  { id: "overview",     label: "Översikt",         accent: "#1A1916", kind: "metrics" },
  { id: "channels",     label: "Kanaler",           accent: "#2D6A4F", kind: "rows", rowValueLabel: "Sessioner" },
  { id: "devices",      label: "Enheter",           accent: "#A05F0A", kind: "rows", rowValueLabel: "Sessioner" },
  { id: "countries",    label: "Länder",            accent: "#1E4A8C", kind: "rows", rowValueLabel: "Sessioner" },
  { id: "landingPages", label: "Landningssidor",   accent: "#9B2335", kind: "rows", rowValueLabel: "Sessioner" },
  { id: "topPages",     label: "Toppade sidor",    accent: "#4A4540", kind: "rows", rowValueLabel: "Sidvisningar" },
  { id: "events",       label: "Händelser",         accent: "#E8524A", kind: "rows", rowValueLabel: "Händelser" },
];

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  overview:     { x: 40,  y: 40  },
  channels:     { x: 420, y: 40  },
  devices:      { x: 720, y: 40  },
  countries:    { x: 40,  y: 420 },
  landingPages: { x: 420, y: 380 },
  topPages:     { x: 760, y: 340 },
  events:       { x: 40,  y: 750 },
};

const STORAGE_KEY = "dr-data-canvas-v2";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtValue(value: number | null, unit: Ga4ExplorerMetric["unit"]): string {
  if (value === null) return "—";
  if (unit === "percent") return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
  if (unit === "seconds") {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return value.toLocaleString("sv-SE");
  return String(Math.round(value * 10) / 10);
}

function fmtDelta(cur: number | null, prev: number | null): { pct: number; label: string } | null {
  if (cur === null || prev === null || prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  return { pct, label: `${pct >= 0 ? "+" : ""}${Math.round(pct)}%` };
}

// ─── GripIcon ─────────────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      {[0, 4, 8].map(x => [0, 4, 8].map(y => (
        <circle key={`${x}-${y}`} cx={x + 1.5} cy={y + 1.5} r="1" fill="currentColor" />
      )))}
    </svg>
  );
}

// ─── MetricsContent ───────────────────────────────────────────────────────────

function MetricsContent({ metrics }: { metrics: Ga4ExplorerMetric[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 16px" }}>
      {metrics.map((m) => {
        const delta = fmtDelta(m.value, m.previousValue);
        const deltaPositive = delta ? (m.trendGood ? delta.pct >= 0 : delta.pct <= 0) : null;
        return (
          <div key={m.key}>
            <div style={{
              fontSize: "11px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#1A1916",
              marginBottom: "5px",
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 600,
            }}>
              {m.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
              <span style={{
                fontSize: "26px",
                fontWeight: 700,
                fontFamily: "'Barlow', sans-serif",
                color: m.value === null ? "rgba(26,25,22,0.25)" : "#1A1916",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}>
                {fmtValue(m.value, m.unit)}
              </span>
              {delta && (
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  fontFamily: "'Barlow', sans-serif",
                  letterSpacing: "0.03em",
                  color: deltaPositive ? "#2D6A4F" : "#9B2335",
                  background: deltaPositive ? "#EAF4EE" : "#F9EAEC",
                  padding: "2px 5px",
                  borderRadius: "4px",
                }}>
                  {delta.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RowsContent ──────────────────────────────────────────────────────────────

function RowsContent({ rows, valueLabel }: { rows: Ga4ExplorerRow[]; valueLabel?: string }) {
  if (rows.length === 0) {
    return (
      <div style={{ color: "rgba(26,25,22,0.25)", fontSize: "13px", padding: "8px 0" }}>—</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {valueLabel && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          paddingBottom: "6px",
          marginBottom: "4px",
          borderBottom: "1px solid rgba(26,25,22,0.07)",
        }}>
          <span style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#1A1916", fontFamily: "'Barlow', sans-serif", fontWeight: 600 }}>
            Dimension
          </span>
          <span style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#1A1916", fontFamily: "'Barlow', sans-serif", fontWeight: 600 }}>
            {valueLabel}
          </span>
        </div>
      )}
      {rows.map((r, i) => {
        const delta = fmtDelta(r.value, r.previousValue);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 0",
              borderBottom: i < rows.length - 1 ? "1px solid rgba(26,25,22,0.06)" : "none",
              gap: "12px",
            }}
          >
            <span style={{
              fontSize: "14px",
              color: "#1A1916",
              fontFamily: "'Barlow', sans-serif",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "160px",
              flex: "1",
            }}>
              {r.dimension}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <span style={{
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: "'Barlow', sans-serif",
                color: r.value === null ? "rgba(26,25,22,0.25)" : "#1A1916",
                letterSpacing: "-0.02em",
              }}>
                {r.value !== null ? r.value.toLocaleString("sv-SE") : "—"}
              </span>
              {delta && (
                <span style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "'Barlow', sans-serif",
                  color: delta.pct >= 0 ? "#2D6A4F" : "#9B2335",
                  minWidth: "32px",
                  textAlign: "right",
                }}>
                  {delta.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DraggableCard ────────────────────────────────────────────────────────────

type CardData =
  | { kind: "metrics"; metrics: Ga4ExplorerMetric[] }
  | { kind: "rows"; rows: Ga4ExplorerRow[]; rowValueLabel?: string };

function DraggableCard({
  def,
  data,
  initialPos,
  onDragEnd,
  hidden,
}: {
  def: CardDef;
  data: CardData | null;
  initialPos: { x: number; y: number };
  onDragEnd: (id: string, x: number, y: number) => void;
  hidden: boolean;
}) {
  const constraintsRef = useRef(null);

  if (hidden) return null;

  const isEmpty = !data;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={{ x: initialPos.x, y: initialPos.y, opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ opacity: { duration: 0.3 }, scale: { duration: 0.3 } }}
      onDragEnd={(_, info) => {
        const el = document.getElementById(`card-${def.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const canvas = el.closest("[data-canvas]");
          if (canvas) {
            const cr = canvas.getBoundingClientRect();
            onDragEnd(def.id, rect.left - cr.left, rect.top - cr.top);
          }
        }
      }}
      id={`card-${def.id}`}
      style={{
        position: "absolute",
        width: def.kind === "metrics" ? "380px" : "300px",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        border: `1px solid rgba(26,25,22,0.1)`,
        borderRadius: "16px",
        boxShadow: "none",
        overflow: "hidden",
        cursor: "grab",
        userSelect: "none",
        zIndex: 10,
      }}
      whileDrag={{ cursor: "grabbing", scale: 1.01, zIndex: 50, boxShadow: "none" }}
    >
      {/* Accent top bar */}
      <div style={{ height: "2px", background: def.accent, opacity: 0.8 }} />

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "14px 16px 12px",
        borderBottom: "1px solid rgba(26,25,22,0.07)",
      }}>
        <div style={{ color: "rgba(26,25,22,0.25)", flexShrink: 0, display: "flex" }}>
          <GripIcon />
        </div>
        <div style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: def.accent,
          flexShrink: 0,
          boxShadow: "none",
        }} />
        <span style={{
          fontSize: "11px",
          fontWeight: 700,
          fontFamily: "'Barlow', sans-serif",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(26,25,22,0.75)",
          flex: 1,
        }}>
          {def.label}
        </span>
        {isEmpty && (
          <span style={{ fontSize: "10px", color: "rgba(26,25,22,0.25)", fontFamily: "'Barlow', sans-serif" }}>
            Laddar...
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px" }}>
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: "12px", borderRadius: "4px", background: "rgba(26,25,22,0.06)", width: `${60 + i * 10}%` }} />
            ))}
          </div>
        ) : data.kind === "metrics" ? (
          <MetricsContent metrics={data.metrics} />
        ) : (
          <RowsContent rows={data.rows} valueLabel={data.rowValueLabel} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  hidden,
  onToggle,
  onReset,
  loading,
}: {
  hidden: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
  loading: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px",
      background: "rgba(255, 255, 255, 0.92)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(26,25,22,0.1)",
      borderRadius: "12px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    }}>
      {CARD_DEFS.map(def => (
        <button
          key={def.id}
          onClick={() => onToggle(def.id)}
          style={{
            padding: "5px 10px",
            borderRadius: "7px",
            border: "none",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: 700,
            fontFamily: "'Barlow', sans-serif",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            transition: "all 0.15s ease",
            background: hidden.has(def.id) ? "transparent" : `${def.accent}22`,
            color: hidden.has(def.id) ? "rgba(26,25,22,0.3)" : def.accent,
            outline: hidden.has(def.id) ? "none" : `1px solid ${def.accent}44`,
          }}
        >
          {def.label}
        </button>
      ))}
      <div style={{ width: "1px", height: "20px", background: "rgba(26,25,22,0.1)", margin: "0 2px" }} />
      <button
        onClick={onReset}
        style={{
          padding: "5px 10px",
          borderRadius: "7px",
          border: "none",
          cursor: "pointer",
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: "'Barlow', sans-serif",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "transparent",
          color: "rgba(26,25,22,0.35)",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(26,25,22,0.75)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(26,25,22,0.35)")}
      >
        Återställ
      </button>
    </div>
  );
}

// ─── Dot grid background ──────────────────────────────────────────────────────

const DOT_GRID_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='1' cy='1' r='1' fill='rgba(26,25,22,0.12)'/%3E%3C/svg%3E")`;

// ─── Main page ────────────────────────────────────────────────────────────────

function getCardData(def: CardDef, data: Ga4ExplorerData): CardData {
  if (def.id === "overview") return { kind: "metrics", metrics: data.overview };
  const rowsMap: Record<string, Ga4ExplorerRow[]> = {
    channels: data.channels,
    devices: data.devices,
    countries: data.countries,
    landingPages: data.landingPages,
    topPages: data.topPages,
    events: data.events,
  };
  return { kind: "rows", rows: rowsMap[def.id] ?? [], rowValueLabel: def.rowValueLabel };
}

export default function DataPage() {
  return (
    <Suspense>
      <DataPageInner />
    </Suspense>
  );
}

function DataPageInner() {
  const { locale } = useLocale();
  const dateRange = useDateRange();
  const [explorerData, setExplorerData] = useState<Ga4ExplorerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSource, setNoSource] = useState(false);
  const [properties, setProperties] = useState<Array<{ property_id: string; display_name: string | null }>>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    if (typeof window === "undefined") return DEFAULT_POSITIONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_POSITIONS, ...JSON.parse(saved) } : DEFAULT_POSITIONS;
    } catch {
      return DEFAULT_POSITIONS;
    }
  });
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Load all GA4 properties once
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("connected_sources")
      .select("property_id, display_name")
      .eq("source", "ga4")
      .neq("property_id", "_pending")
      .then(({ data }) => {
        if (!data || data.length === 0) { setNoSource(true); setLoading(false); return; }
        setProperties(data);
        setActivePropertyId(prev => prev ?? data[0].property_id);
      });
  }, []);

  // Fetch data when property or date range changes
  useEffect(() => {
    if (!activePropertyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setExplorerData(null);

      const res = await fetch("/api/ga4-explorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: activePropertyId, dateRange }),
      });

      if (cancelled) return;
      if (res.ok) {
        const json = await res.json() as Ga4ExplorerData;
        setExplorerData(json);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activePropertyId, dateRange.startDate, dateRange.endDate]);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setPositions(prev => {
      const next = { ...prev, [id]: { x: Math.max(0, x), y: Math.max(0, y) } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleToggle = useCallback((id: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setPositions(DEFAULT_POSITIONS);
    setHidden(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#F5F3EF" }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: "64px",
        borderBottom: "1px solid rgba(26,25,22,0.07)",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "'Barlow', sans-serif",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(26,25,22,0.4)",
          }}>
            GA4 · Explorer
          </span>

          {/* Property switcher */}
          {properties.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bone-dark)", borderRadius: "8px", padding: "3px" }}>
              {properties.map((p) => (
                <button
                  key={p.property_id}
                  onClick={() => setActivePropertyId(p.property_id)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "'Barlow', sans-serif",
                    letterSpacing: "0.02em",
                    transition: "all 0.15s ease",
                    background: activePropertyId === p.property_id ? "#1A1916" : "transparent",
                    color: activePropertyId === p.property_id ? "#fff" : "rgba(26,25,22,0.5)",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {p.display_name ?? p.property_id}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "#1A1916",
              animation: "pulse 1.2s ease-in-out infinite",
            }} />
          )}
          {noSource && (
            <span style={{ fontSize: "12px", color: "rgba(26,25,22,0.4)", fontFamily: "'Barlow', sans-serif" }}>
              {locale === "sv" ? "Ingen GA4-källa ansluten" : "No GA4 source connected"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <DateRangePicker locale={locale} />
        </div>
      </header>

      {/* Canvas */}
      <div
        data-canvas
        style={{
          flex: 1,
          position: "relative",
          backgroundImage: DOT_GRID_SVG,
          backgroundSize: "28px 28px",
          overflow: "hidden",
          minHeight: "calc(100dvh - 64px)",
        }}
      >
        {/* Floating toolbar */}
        <div style={{
          position: "absolute",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 200,
        }}>
          <Toolbar hidden={hidden} onToggle={handleToggle} onReset={handleReset} loading={loading} />
        </div>

        {/* Cards */}
        {CARD_DEFS.map((def) => {
          const pos = positions[def.id] ?? DEFAULT_POSITIONS[def.id];
          const cardData = explorerData ? getCardData(def, explorerData) : null;
          return (
            <DraggableCard
              key={def.id}
              def={def}
              data={cardData}
              initialPos={pos}
              onDragEnd={handleDragEnd}
              hidden={hidden.has(def.id)}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
