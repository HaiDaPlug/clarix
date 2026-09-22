"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useSyncExternalStore, Suspense } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useDateRange } from "@/lib/google/date-presets";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { channelColorByKey } from "@/components/report/channel-colors";
import { formatNumber } from "@/lib/utils/format";
import type { ClientsResponse } from "@/lib/clients/types";
import type { Ga4ExplorerData, Ga4ExplorerMetric, Ga4ExplorerRow } from "@/app/api/ga4-explorer/route";

// ─── Card definitions ─────────────────────────────────────────────────────────

// `hue` borrows an identity colour from the channel palette (validated for
// both themes). The signal colours are for good/bad only, so a card is never
// red just because of where it sits in the list.
type CardDef = {
  id: string;
  label: string;
  hue: string | null;
  kind: "metrics" | "rows";
  rowValueLabel?: string;
};

const CARD_DEFS: CardDef[] = [
  { id: "overview",     label: "Översikt",       hue: null,       kind: "metrics" },
  { id: "channels",     label: "Kanaler",        hue: "organic",  kind: "rows", rowValueLabel: "Sessioner" },
  { id: "devices",      label: "Enheter",        hue: "direct",   kind: "rows", rowValueLabel: "Sessioner" },
  { id: "countries",    label: "Länder",         hue: "referral", kind: "rows", rowValueLabel: "Sessioner" },
  { id: "landingPages", label: "Landningssidor", hue: "social",   kind: "rows", rowValueLabel: "Sessioner" },
  { id: "topPages",     label: "Toppade sidor",  hue: "paid",     kind: "rows", rowValueLabel: "Sidvisningar" },
  { id: "events",       label: "Händelser",      hue: "email",    kind: "rows", rowValueLabel: "Händelser" },
];

// Canvas geometry. Every card has one width so the default arrangement can
// be a true masonry: each card drops into the currently shortest column.
const CARD_W = 340;
const GAP = 20;
const PAD = 32;
const TOOLBAR_SPACE = 96;

// Only positions the person dragged are stored; everything else is laid out.
// v3: the v2 key held fixed defaults that overlapped with real data.
const STORAGE_KEY = "dr-data-canvas-v3";

type Pos = { x: number; y: number };

// Free arrangement needs room; below this the cards simply stack.
const WIDE_QUERY = "(min-width: 1024px)";
function useIsWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

// The server can't know the stored theme, so the first client render uses the
// light values too and the real theme follows right after hydration.
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// ─── Formatters ───────────────────────────────────────────────────────────────
// Same conventions as the rest of the app: "59,6 %", "31 420", never "31.4K".

function fmtValue(value: number | null, unit: Ga4ExplorerMetric["unit"]): string {
  if (value === null) return "—";
  if (unit === "percent") return formatNumber(value, "percent");
  if (unit === "currency") return formatNumber(value, "currency");
  if (unit === "seconds") {
    const total = Math.round(value);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
    return m > 0 ? `${m} min ${s} s` : `${s} s`;
  }
  return formatNumber(value);
}

function fmtDelta(cur: number | null, prev: number | null): { pct: number; label: string } | null {
  if (cur === null || prev === null || prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  return { pct, label: `${pct >= 0 ? "+" : "−"}${Math.abs(Math.round(pct))} %` };
}

// ─── GripIcon ─────────────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      {[0, 4, 8].map(x => [0, 4, 8].map(y => (
        <circle key={`${x}-${y}`} cx={x + 1.5} cy={y + 1.5} r="1" fill="currentColor" />
      )))}
    </svg>
  );
}

// ─── MetricsContent ───────────────────────────────────────────────────────────

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
};

function MetricsContent({ metrics }: { metrics: Ga4ExplorerMetric[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 14px" }}>
      {metrics.map((m) => {
        const delta = fmtDelta(m.value, m.previousValue);
        const good = delta ? (m.trendGood ? delta.pct >= 0 : delta.pct <= 0) : null;
        return (
          <div key={m.key} className="min-w-0">
            <div style={{ ...LABEL_STYLE, marginBottom: "5px" }}>{m.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 7px" }}>
              <span
                className="tabular-nums"
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  fontFamily: "var(--font-numeric)",
                  color: m.value === null ? "var(--text-tertiary)" : "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {fmtValue(m.value, m.unit)}
              </span>
              {delta && (
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: good ? "var(--signal-up)" : "var(--signal-down)",
                    background: good ? "var(--signal-up-bg)" : "var(--signal-down-bg)",
                    padding: "1px 6px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                  }}
                >
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
    return <p style={{ color: "var(--text-tertiary)", fontSize: "13px", padding: "4px 0" }}>Inget att visa för perioden.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {valueLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", marginBottom: "2px", borderBottom: "1px solid var(--line-soft)" }}>
          <span style={LABEL_STYLE}>Dimension</span>
          <span style={LABEL_STYLE}>{valueLabel}</span>
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
              borderBottom: i < rows.length - 1 ? "1px solid var(--line-soft)" : "none",
              gap: "12px",
            }}
          >
            <span
              title={r.dimension || undefined}
              style={{
                fontSize: "14px",
                color: r.dimension ? "var(--text-primary)" : "var(--text-tertiary)",
                fontStyle: r.dimension ? undefined : "italic",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                flex: "1",
              }}
            >
              {r.dimension || "(tomt)"}
            </span>
            <div className="tabular-nums" style={{ display: "flex", alignItems: "baseline", gap: "8px", flexShrink: 0 }}>
              <span style={{ fontSize: "15px", fontWeight: 600, fontFamily: "var(--font-numeric)", color: r.value === null ? "var(--text-tertiary)" : "var(--text-primary)" }}>
                {r.value !== null ? formatNumber(r.value) : "—"}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: delta ? (delta.pct >= 0 ? "var(--signal-up)" : "var(--signal-down)") : "transparent", minWidth: "44px", textAlign: "right" }}>
                {delta?.label ?? "·"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type CardData =
  | { kind: "metrics"; metrics: Ga4ExplorerMetric[] }
  | { kind: "rows"; rows: Ga4ExplorerRow[]; rowValueLabel?: string };

function CardBody({ def, data, accent, draggable }: { def: CardDef; data: CardData | null; accent: string; draggable: boolean }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "13px 16px 11px", borderBottom: "1px solid var(--line-soft)" }}>
        {draggable && (
          <span style={{ color: "var(--text-tertiary)", flexShrink: 0, display: "flex" }}>
            <GripIcon />
          </span>
        )}
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: accent, flexShrink: 0 }} aria-hidden />
        <span style={{ ...LABEL_STYLE, color: "var(--text-primary)", letterSpacing: "0.08em", flex: 1 }}>{def.label}</span>
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        {!data ? (
          <div className="flex flex-col gap-2.5" aria-hidden>
            {[70, 85, 60, 78].map((w, i) => <div key={i} className="skeleton h-3" style={{ width: `${w}%` }} />)}
          </div>
        ) : data.kind === "metrics" ? (
          <MetricsContent metrics={data.metrics} />
        ) : (
          <RowsContent rows={data.rows} valueLabel={data.rowValueLabel} />
        )}
      </div>
    </>
  );
}

const CARD_SURFACE: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-card)",
  overflow: "hidden",
};

function CanvasCard({
  def,
  data,
  accent,
  pos,
  animatePos,
  visible,
  onDragEnd,
  cardRef,
}: {
  def: CardDef;
  data: CardData | null;
  accent: string;
  pos: Pos;
  animatePos: boolean;
  visible: boolean;
  onDragEnd: (id: string, x: number, y: number) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div
      ref={cardRef}
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={false}
      animate={{ x: pos.x, y: pos.y, opacity: visible ? 1 : 0 }}
      transition={{ x: { duration: animatePos ? 0.3 : 0 }, y: { duration: animatePos ? 0.3 : 0 }, opacity: { duration: 0.25 } }}
      onDragEnd={(e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>("[data-card]");
        const canvas = el?.closest("[data-canvas]");
        if (!el || !canvas) return;
        const rect = el.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        onDragEnd(def.id, rect.left - cr.left, rect.top - cr.top);
      }}
      data-card
      style={{ ...CARD_SURFACE, position: "absolute", left: 0, top: 0, width: CARD_W, cursor: "grab", userSelect: "none", zIndex: 10 }}
      whileDrag={{ cursor: "grabbing", zIndex: 50, boxShadow: "var(--shadow-raised)" }}
    >
      <CardBody def={def} data={data} accent={accent} draggable />
    </motion.div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  hidden,
  accents,
  onToggle,
  onReset,
}: {
  hidden: Set<string>;
  accents: Record<string, string>;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <div
      className="flex max-w-full items-center gap-1.5 overflow-x-auto"
      style={{ padding: "6px", background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "12px", boxShadow: "var(--shadow-raised)" }}
    >
      {CARD_DEFS.map(def => {
        const on = !hidden.has(def.id);
        const accent = accents[def.id];
        return (
          <button
            key={def.id}
            onClick={() => onToggle(def.id)}
            aria-pressed={on}
            className="shrink-0 rounded-[7px] px-2.5 py-[5px] text-[10px] font-bold uppercase tracking-[0.06em] hover:bg-[var(--hover-surface)]"
            style={
              on
                ? { color: "var(--text-primary)", background: `color-mix(in oklab, ${accent} 12%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 35%, transparent)` }
                : { color: "var(--text-tertiary)" }
            }
          >
            {def.label}
          </button>
        );
      })}
      <span className="mx-0.5 h-5 w-px shrink-0" style={{ background: "var(--line)" }} aria-hidden />
      <button
        onClick={onReset}
        className="shrink-0 rounded-[7px] px-2.5 py-[5px] text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-tertiary)] hover:bg-[var(--hover-surface)] hover:text-[var(--text-primary)]"
      >
        Återställ
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const dotGrid = (fill: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='1' cy='1' r='1' fill='${encodeURIComponent(fill)}'/%3E%3C/svg%3E")`;

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
  const { theme: storedTheme } = useTheme();
  const theme = useHydrated() ? storedTheme : "light";
  const wide = useIsWide();
  const dateRange = useDateRange();
  const [explorerData, setExplorerData] = useState<Ga4ExplorerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSource, setNoSource] = useState(false);
  const [properties, setProperties] = useState<Array<{ property_id: string; display_name: string | null }>>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, Pos>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Record<string, Pos>) : {};
    } catch {
      return {};
    }
  });
  const [auto, setAuto] = useState<Record<string, Pos>>({});
  const [canvasH, setCanvasH] = useState(0);
  const [laidOut, setLaidOut] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const accents = Object.fromEntries(
    CARD_DEFS.map((d) => [d.id, d.hue ? channelColorByKey(d.hue, theme) : "var(--text-primary)"]),
  ) as Record<string, string>;

  // The GA4 properties assigned to the user's workspaces, active workspace first.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<ClientsResponse>) : null))
      .then((payload) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const list = (payload?.clients ?? [])
          .slice()
          .sort((a, b) => Number(b.isActive) - Number(a.isActive))
          .flatMap((c) => {
            const ref = c.sources.ga4;
            if (!ref || seen.has(ref.propertyId)) return [];
            seen.add(ref.propertyId);
            return [{ property_id: ref.propertyId, display_name: ref.displayName ?? c.name }];
          });
        if (list.length === 0) { setNoSource(true); setLoading(false); return; }
        setProperties(list);
        setActivePropertyId((prev) => prev ?? list[0].property_id);
      })
      .catch(() => {
        if (!cancelled) { setNoSource(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  // Fetch data when property or date range changes
  useEffect(() => {
    if (!activePropertyId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFailed(false);
      setExplorerData(null);

      try {
        const res = await fetch("/api/ga4-explorer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: activePropertyId, dateRange }),
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(String(res.status));
        setExplorerData(await res.json() as Ga4ExplorerData);
      } catch {
        // Without this the cards would sit on their placeholders forever.
        if (!cancelled) setFailed(true);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePropertyId, dateRange.startDate, dateRange.endDate, attempt]);

  // ── Masonry. Measure each card, drop the ones the person hasn't moved into
  //    the shortest column, and size the canvas to the lowest card so nothing
  //    is clipped and the page scrolls instead.
  const canvasRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<Record<string, HTMLDivElement | null>>({});
  const [canvasW, setCanvasW] = useState(0);
  // First placement jumps into position; later rearrangements glide.
  const [glide, setGlide] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !wide) return;
    const ro = new ResizeObserver(([entry]) => setCanvasW(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);

  useLayoutEffect(() => {
    if (!wide || canvasW === 0) return;
    const visible = CARD_DEFS.filter((d) => !hidden.has(d.id));
    const cols = Math.max(1, Math.floor((canvasW - PAD * 2 + GAP) / (CARD_W + GAP)));
    const colX = (c: number) => PAD + c * (CARD_W + GAP);
    const tops = Array.from({ length: cols }, () => PAD);
    const next: Record<string, Pos> = {};
    let bottom = PAD;
    for (const d of visible) {
      const h = cardEls.current[d.id]?.offsetHeight ?? 200;
      const m = manual[d.id];
      if (m) {
        bottom = Math.max(bottom, m.y + h);
        continue;
      }
      const c = tops.indexOf(Math.min(...tops));
      next[d.id] = { x: colX(c), y: tops[c] };
      tops[c] += h + GAP;
      bottom = Math.max(bottom, tops[c] - GAP);
    }
    // Placement depends on measured heights, so state is set from the layout
    // effect on purpose; it converges because heights don't depend on position.
    /* eslint-disable react-hooks/set-state-in-effect */
    setAuto((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    setCanvasH(bottom + PAD + TOOLBAR_SPACE);
    setGlide(laidOut);
    setLaidOut(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [wide, canvasW, hidden, manual, explorerData, loading, laidOut]);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setManual(prev => {
      const next = { ...prev, [id]: { x: Math.max(0, x), y: Math.max(0, y) } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleToggle = useCallback((id: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setManual({});
    setHidden(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const cardData = (def: CardDef) => (explorerData ? getCardData(def, explorerData) : null);
  const sv = locale === "sv";

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: "var(--surface-tint)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-[100] flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b py-3 pl-16 pr-4 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--line)", background: "var(--surface-page)" }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="eyebrow hidden shrink-0 sm:inline">GA4 · Explorer</span>

          {/* Property switcher */}
          {properties.length > 0 && (
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg p-[3px]" style={{ background: "var(--surface-tint)" }}>
              {properties.map((p) => {
                const on = activePropertyId === p.property_id;
                return (
                  <button
                    key={p.property_id}
                    onClick={() => setActivePropertyId(p.property_id)}
                    aria-pressed={on}
                    className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-semibold ${on ? "" : "hover:text-[var(--text-primary)]"}`}
                    style={on ? { background: "var(--text-primary)", color: "var(--surface-page)" } : { color: "var(--text-secondary)" }}
                  >
                    {p.display_name ?? p.property_id}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <DateRangePicker locale={locale} loading={loading && !!activePropertyId} />
      </header>

      {/* Canvas */}
      <div
        ref={canvasRef}
        data-canvas
        className="relative flex-1"
        style={{
          backgroundImage: dotGrid(theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(26,25,22,0.12)"),
          backgroundSize: "28px 28px",
          minHeight: wide ? Math.max(canvasH, 0) : undefined,
        }}
      >
        {(noSource || failed) && (
          <div className="pointer-events-none absolute inset-0 z-[300] flex items-start justify-center p-4 pt-24">
            <div className="surface-card pointer-events-auto w-full max-w-sm p-6 text-center" style={{ boxShadow: "var(--shadow-raised)" }} role={failed ? "alert" : "status"}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text-primary)" }}>
                {noSource
                  ? (sv ? "Ingen GA4-källa ännu" : "No GA4 source yet")
                  : (sv ? "Datan kunde inte hämtas" : "Couldn't load the data")}
              </p>
              <p className="mx-auto mt-1.5" style={{ fontSize: "13px", lineHeight: 1.55, color: "var(--text-secondary)", maxWidth: "32ch" }}>
                {noSource
                  ? (sv ? "Välj en Google Analytics-egendom så fylls korten med din trafik." : "Pick a Google Analytics property and these cards fill with your traffic.")
                  : (sv ? "Google svarade inte. Försök igen om en stund." : "Google didn't respond. Try again in a moment.")}
              </p>
              {noSource ? (
                <Link href="/integrations" className="btn btn-primary mt-5">
                  {sv ? "Koppla Google Analytics" : "Connect Google Analytics"}
                </Link>
              ) : (
                <button onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary mt-5">
                  {sv ? "Försök igen" : "Try again"}
                </button>
              )}
            </div>
          </div>
        )}

        {wide ? (
          CARD_DEFS.filter((d) => !hidden.has(d.id)).map((def) => (
            <CanvasCard
              key={def.id}
              def={def}
              data={cardData(def)}
              accent={accents[def.id]}
              pos={manual[def.id] ?? auto[def.id] ?? { x: PAD, y: PAD }}
              animatePos={glide}
              visible={laidOut}
              onDragEnd={handleDragEnd}
              cardRef={(el) => { cardEls.current[def.id] = el; }}
            />
          ))
        ) : (
          // Narrow screens: no free arrangement, just the cards in reading order.
          <div className="columns-1 gap-4 p-4 sm:columns-2 sm:p-6" style={{ paddingBottom: TOOLBAR_SPACE }}>
            {CARD_DEFS.filter((d) => !hidden.has(d.id)).map((def) => (
              <div key={def.id} className="mb-4 break-inside-avoid" style={CARD_SURFACE}>
                <CardBody def={def} data={cardData(def)} accent={accents[def.id]} draggable={false} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar: rides the bottom of the viewport, rests under the last card. */}
      <div className="pointer-events-none sticky bottom-0 z-[200] -mt-[88px] flex justify-center px-4 pb-6">
        <div className="pointer-events-auto max-w-full">
          <Toolbar hidden={hidden} accents={accents} onToggle={handleToggle} onReset={handleReset} />
        </div>
      </div>
    </div>
  );
}
