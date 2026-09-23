"use client";

/* ────────────────────────────────────────────────────────────────────────────
 * THROWAWAY — variant D: vertical column chart, copying the reference layout.
 *
 * Deliberately flat: one column per channel, no drill-down. The reference has
 * none, and how Paid Social should expand here is still an open question.
 *
 * Layout anatomy taken from the reference, top to bottom:
 *   eyebrow → headline → subline with the numbers emphasised
 *   → plot area: faint full-height track per column, bar rising from the
 *     baseline, value pill floating just above each bar
 *   → baseline rule → brand mark → label (with "(du)" on the client's own row)
 *
 * Delete with src/app/report-lab/.
 * ──────────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NoiseTile } from "@/components/ui/noise-tile";
import { type SlideData } from "@/components/report/slide-data";
import { fmtNum } from "@/components/report/primitives/TrendPill";
import { useSlideReveal, fadeUp } from "@/components/report/primitives/reveal";
import {
  channelMark,
  networkMark,
  segmentColor,
  MarkGlyph,
} from "@/components/report/channel-marks";

const FALLBACK_COLORS = ["#FF6B6B", "#F59E0B", "#6B8FFF", "#34C759", "#A855F7", "#F97316"];

/* The plot is a fixed height so the columns always share one baseline and one
 * ceiling regardless of channel count — the reference's most defining trait.
 *
 * Budget, against the 484px the canvas leaves below the heading block:
 *   PLOT_H 300 + baseline 1 + FOOT_H 76 = 377, leaving headroom for the value
 *   pill that floats above the tallest bar. The tallest bar is capped at
 *   MAX_FILL of the plot so that pill always has somewhere to sit. */
const PLOT_H = 292;
/** Fits a two-line label ("Google (obetalt)") plus mark and visit count. */
const FOOT_H = 92;
const MAX_FILL = 0.88;
/** Column width. Narrow enough to read as a slim chart, wide enough that the
 *  foot labels ("Direkttrafik", "Betald social") do not truncate. */
const COL_MAX_W = 88;

/* Segments are strictly proportional and stay that way. Heights never change —
 * not at rest, not on hover — so the chart cannot misrepresent a share even
 * momentarily. Room for a label is found sideways instead: the hovered slice
 * grows out of the column into the gap beside it, where there is always space,
 * and carries its name and percentage in that new width. Nothing in the stack
 * moves. A hair of height keeps a sub-pixel slice hoverable. */
const HOVER_EXTRA_W = 132;
/** Minimum height of a hovered slice, so its label always has room. Applies to
 *  the extended state only — the resting stack is never distorted. */
const HOVER_LABEL_H = 34;
const SEG_MIN_H = 3;

type Segment = {
  source: string;
  name: string;
  pct: number;
  visits: number;
  height: number;
};

/** Split `total` px across networks in proportion to their share. Heights are
 *  fixed by the data alone — hover does not enter into it. */
function layoutSegments(
  subs: NonNullable<SlideData["topChannels"][number]["subChannels"]>,
  total: number,
): Segment[] {
  const shareSum = subs.reduce((sum, s) => sum + s.pct, 0) || 1;
  return subs.map((s) => ({
    source: s.source,
    name: s.name,
    pct: s.pct,
    visits: s.visits,
    height: Math.max(SEG_MIN_H, (s.pct / shareSum) * total),
  }));
}

export function ProtoColumns({ d }: { d: SlideData }) {
  const { ref, active, reduced } = useSlideReveal();

  const channels = d.topChannels;
  // Scale to the largest channel, not to 100%, so the tallest column always
  // fills the plot. A 48%-max chart with a 100% ceiling wastes half the height.
  const max = Math.max(...channels.map((c) => c.pct), 1);
  const top = channels[0];
  const rest = channels.slice(1).reduce((sum, c) => sum + c.pct, 0);

  return (
    <div className="flex h-full flex-col">
      <motion.div {...fadeUp(active, reduced)}>
        <p className="text-[13px] font-semibold uppercase tracking-[0.26em] text-foreground/45">
          Trafikkällor
        </p>
        <h1 className="font-display mt-3 text-[3.4rem] font-bold leading-[1.05] tracking-tight">
          Så här hittar besökarna till er
        </h1>
        <p className="mt-4 text-[19px] leading-relaxed text-foreground/60">
          <strong className="font-semibold text-foreground">
            {Math.round(rest)}% av besöken
          </strong>{" "}
          kommer från andra källor än {top?.name ?? "—"}, som står för{" "}
          <strong className="font-semibold text-foreground">{top?.pct ?? 0}%</strong> av
          trafiken.
        </p>
      </motion.div>

      {/* Narrow columns, centred as a group. The gap grows as columns get fewer
          so the set stays a composition rather than drifting apart. */}
      <div ref={ref} data-channel-area className="mt-8 flex items-end justify-center">
        <div
          className="grid items-end"
          style={{
            gridTemplateColumns: `repeat(${channels.length}, ${COL_MAX_W}px)`,
            columnGap: channels.length > 5 ? 28 : channels.length > 3 ? 40 : 56,
          }}
        >
          {channels.map((c, i) => (
            <Column
              key={c.name}
              channel={c}
              index={i}
              max={max}
              active={active}
              reduced={reduced}
              fallback={FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** One network inside a subdivided column. Rests semi-transparent so the stack
 *  reads as a group; the hovered one goes fully opaque while its siblings drop
 *  further back, so attention lands without anything moving. */
function NetworkSegment({
  seg,
  index,
  reduced,
  hovered,
  onHover,
}: {
  seg: Segment;
  index: number;
  reduced: boolean;
  hovered: string | null;
  onHover: (source: string | null) => void;
}) {
  const mark = networkMark(seg.source);
  const isHovered = hovered === seg.source;
  const dimmed = hovered !== null && !isHovered;

  return (
    // Height is fixed by share. Hover grows the slice to the right, out of the
    // column and into the gap, where the label has room regardless of how thin
    // the slice is. z-index lifts it over neighbouring columns while extended.
    <div
      data-seg={seg.source}
      className="relative w-full"
      style={{ height: seg.height, zIndex: isHovered ? 20 : 1 }}
      onMouseEnter={() => onHover(seg.source)}
      onMouseLeave={() => onHover(null)}
    >
      {/* The slice itself. Its in-column height is always the true share; on
          hover it grows rightward out of the column and, only in that extension,
          tall enough to carry a label — vertically centred on its own band so
          the stack's proportions are still what you read. */}
      <motion.div
        className="absolute left-0 top-1/2 flex items-center"
        style={{
          background: segmentColor(mark),
          y: "-50%",
          transformOrigin: "left center",
        }}
        animate={{
          width: isHovered ? COL_MAX_W + HOVER_EXTRA_W : COL_MAX_W,
          height: isHovered ? Math.max(seg.height, HOVER_LABEL_H) : seg.height,
          opacity: isHovered ? 1 : dimmed ? 0.45 : 0.72,
          borderRadius: isHovered ? 7 : 0,
          paddingLeft: isHovered ? COL_MAX_W + 12 : 0,
        }}
        transition={{
          duration: reduced ? 0 : 0.28,
          ease: [0.22, 1, 0.36, 1],
          opacity: { duration: reduced ? 0 : 0.18 },
        }}
      >
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="flex items-baseline gap-2 whitespace-nowrap"
              initial={reduced ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: reduced ? 0 : 0.16, delay: reduced ? 0 : 0.1 }}
            >
              <span className="text-[12px] font-semibold leading-none text-white">
                {seg.name}
              </span>
              <span className="font-stat text-[16px] font-bold leading-none tabular-nums text-white">
                {seg.pct}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hairline between stacked networks. */}
      {index > 0 && !isHovered && (
        <span className="absolute inset-x-0 top-0 z-10 h-px bg-white/45" />
      )}
    </div>
  );
}

function Column({
  channel: c,
  index,
  max,
  active,
  reduced,
  fallback,
}: {
  channel: SlideData["topChannels"][number];
  index: number;
  max: number;
  active: boolean;
  reduced: boolean;
  fallback: string;
}) {
  const mark = channelMark(c.name);
  const color = mark?.color ?? fallback;
  const delay = reduced ? 0 : 0.25 + index * 0.07;

  const subs = c.subChannels ?? [];
  const isSplit = subs.length > 1;
  const [hovered, setHovered] = useState<string | null>(null);

  // Height is always the true share — a subdivided column is never lifted.
  const barH = (c.pct / max) * MAX_FILL * PLOT_H;
  const segments = isSplit ? layoutSegments(subs, barH) : [];

  return (
    <div className="flex flex-col items-center">
      {/* Plot cell — the faint track runs the full height so every column reads
          against the same ceiling, which is what makes the ranking legible. */}
      <div className="relative w-full" style={{ height: PLOT_H }}>
        <div
          className="absolute inset-x-0 bottom-0 top-0 rounded-t-[10px]"
          style={{ background: "#F7F7F8" }}
        />

        {/* Value pill, riding just above the bar */}
        <motion.div
          className="absolute inset-x-0 flex justify-center"
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{
            opacity: active ? 1 : 0,
            y: active ? 0 : reduced ? 0 : 6,
            bottom: active ? barH + 10 : 10,
          }}
          transition={{
            opacity: { duration: reduced ? 0 : 0.3, delay: delay + 0.55 },
            y: { duration: reduced ? 0 : 0.3, delay: delay + 0.55 },
            bottom: { duration: reduced ? 0 : 1.1, delay, ease: [0.22, 1, 0.36, 1] },
          }}
        >
          <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 font-stat text-[14px] font-bold tabular-nums">
            {c.pct}%
          </span>
        </motion.div>

        {/* The bar */}
        <motion.div
          className={`absolute inset-x-0 bottom-0 rounded-t-[10px] ${isSplit ? "" : "overflow-hidden"}`}
          style={{ background: isSplit ? "transparent" : color }}
          initial={reduced ? false : { height: 0 }}
          animate={{ height: active ? barH : 0 }}
          transition={{ duration: reduced ? 0 : 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {isSplit ? (
            // No clipping anywhere on this path — a hovered slice has to be able
            // to extend past the column's own width.
            <div className="flex h-full w-full flex-col items-start overflow-visible [&>*:first-child]:rounded-t-[10px]">
              {segments.map((seg, si) => (
                <NetworkSegment
                  key={seg.source}
                  seg={seg}
                  index={si}
                  reduced={reduced}
                  hovered={hovered}
                  onHover={setHovered}
                />
              ))}
            </div>
          ) : (
            <NoiseTile blendMode="soft-light" opacity={0.28} />
          )}
        </motion.div>

      </div>

      {/* Baseline + foot */}
      <div className="h-px w-full shrink-0" style={{ background: "rgba(20,18,16,0.12)" }} />
      <motion.div
        className="flex w-full shrink-0 flex-col items-center pt-4"
        style={{ height: FOOT_H }}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.35, delay: delay + 0.5 }}
      >
        {mark ? (
          <MarkGlyph mark={mark} size={20} title={c.name} />
        ) : (
          <c.icon style={{ color, width: 20, height: 20 }} />
        )}
        {/* Two lines rather than truncation — "Google (obetalt)" is the only
            long label and clipping it to "Google (obet…" loses the distinction
            from "Google Ads", which is the whole point of the parenthetical. */}
        <p className="mt-2 line-clamp-2 max-w-full text-center text-[13px] font-medium leading-tight text-foreground/70">
          {c.name}
        </p>
        <p className="text-[11px] tabular-nums text-foreground/40">{fmtNum(c.visits)}</p>
      </motion.div>
    </div>
  );
}
