"use client";

/* ────────────────────────────────────────────────────────────────────────────
 * THROWAWAY — variant C: the colleague's mockup, built on variant A.
 *
 * Same scaling bar rows as A, plus the four things the mockup adds:
 *   1. column headers (Besök / Andel / Förändring)
 *   2. the expanded channel becomes one tinted panel wrapping parent + networks
 *   3. brand marks via channel-marks.tsx (placeholder icons until art lands)
 *   4. each network's bar takes its own brand colour, not the parent's
 *
 * Delete with src/app/report-lab/.
 * ──────────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { NoiseTile } from "@/components/ui/noise-tile";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { type SlideData } from "@/components/report/slide-data";
import { fmtNum, sign, TrendPill } from "@/components/report/primitives/TrendPill";
import { SlideHeading } from "@/components/report/primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "@/components/report/primitives/reveal";
import { channelMark, networkMark, MarkGlyph } from "@/components/report/channel-marks";

const CHANNEL_COLORS = ["#FF6B6B", "#F59E0B", "#6B8FFF", "#34C759", "#A855F7", "#F97316"];

type Channel = SlideData["topChannels"][number];

/* Row metrics per channel count. An expanded channel adds its networks inside
 * the same 484px area, so the collapsed rows are sized to leave room for the
 * largest breakdown (5 rows) even at n=6. */
const SCALE = {
  1: { track: 88, gap: 0, name: 25, stat: 44, tile: 60, glyph: 30 },
  2: { track: 76, gap: 44, name: 22, stat: 40, tile: 54, glyph: 27 },
  3: { track: 62, gap: 32, name: 20, stat: 35, tile: 48, glyph: 24 },
  4: { track: 50, gap: 22, name: 18, stat: 30, tile: 44, glyph: 22 },
  5: { track: 42, gap: 16, name: 16, stat: 26, tile: 38, glyph: 19 },
  6: { track: 36, gap: 12, name: 15, stat: 23, tile: 34, glyph: 17 },
} as const;

/* Collapsed rows tighten while a breakdown is open so the detail always fits. */
const DENSE = { track: 26, gap: 6, name: 14, stat: 19, tile: 28, glyph: 14 } as const;

const LABEL_W = 250;
const PCT_W = 92;
const DELTA_W = 84;
const CHEV_W = 28;

export function ProtoMockup({ d }: { d: SlideData }) {
  const { ref, active, reduced } = useSlideReveal();
  const [expanded, setExpanded] = useState<string | null>(null);

  const channels = d.topChannels;
  const n = Math.min(Math.max(channels.length, 1), 6) as keyof typeof SCALE;
  const openSubs = channels.find((c) => c.name === expanded)?.subChannels?.length ?? 0;
  // Compact only when the open breakdown would not otherwise fit.
  const dense = expanded !== null && channels.length + openSubs > 7;
  const s = dense ? DENSE : SCALE[n];

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
          Dina bästa trafikkällor
        </SlideHeading>
      </motion.div>

      <div ref={ref} data-channel-area className="flex h-[500px] flex-col">
        {/* Column headers — the mockup's clearest addition: the three numbers
            on every row are otherwise unlabelled. */}
        <motion.div
          className="mb-3 flex shrink-0 items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/40"
          {...fadeUp(active, reduced, { y: 8, delay: 0.15 })}
        >
          <span style={{ width: LABEL_W }} className="shrink-0">
            Källa
          </span>
          <span className="flex-1">Besök</span>
          <span style={{ width: PCT_W }} className="shrink-0 text-right">
            Andel
          </span>
          <span style={{ width: DELTA_W }} className="shrink-0 text-right">
            Förändring
          </span>
          <span style={{ width: CHEV_W }} className="shrink-0" />
        </motion.div>

        <div className="flex min-h-0 flex-1 flex-col justify-center" style={{ gap: s.gap }}>
          {channels.map((c, i) => (
            <ChannelRow
              key={c.name}
              channel={c}
              index={i}
              fallbackColor={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
              scale={s}
              active={active}
              reduced={reduced}
              open={expanded === c.name}
              onToggle={() =>
                setExpanded((cur) => (cur === c.name ? null : c.name))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelRow({
  channel: c,
  index,
  fallbackColor,
  scale: s,
  active,
  reduced,
  open,
  onToggle,
}: {
  channel: Channel;
  index: number;
  fallbackColor: string;
  scale: typeof DENSE | (typeof SCALE)[keyof typeof SCALE];
  active: boolean;
  reduced: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const subs = c.subChannels ?? [];
  const hasSubs = subs.length > 0;
  const isOpen = hasSubs && open;
  const mark = channelMark(c.name);
  const color = mark?.color ?? fallbackColor;
  const stagger = reduced ? 0 : index * 0.09;

  return (
    // The whole group — parent row plus networks — becomes one tinted panel
    // while open, so the drill-down reads as a single object rather than rows
    // that happen to be adjacent.
    <motion.div
      className="rounded-2xl"
      animate={{
        backgroundColor: isOpen ? `${color}0F` : "rgba(0,0,0,0)",
        paddingLeft: isOpen ? 12 : 0,
        paddingRight: isOpen ? 12 : 0,
        paddingTop: isOpen ? 10 : 0,
        paddingBottom: isOpen ? 10 : 0,
      }}
      transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`flex items-center gap-4 ${hasSubs ? "cursor-pointer" : ""}`}
        role={hasSubs ? "button" : undefined}
        tabIndex={hasSubs ? 0 : undefined}
        aria-expanded={hasSubs ? isOpen : undefined}
        onClick={hasSubs ? onToggle : undefined}
        onKeyDown={
          hasSubs
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
      >
        {/* Source */}
        <div className="flex shrink-0 items-center gap-3" style={{ width: LABEL_W }}>
          <div
            className="flex shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${color}1F`, width: s.tile, height: s.tile }}
          >
            {mark ? (
              <MarkGlyph mark={mark} size={s.glyph} title={c.name} />
            ) : (
              <c.icon style={{ color, width: s.glyph, height: s.glyph }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold leading-tight" style={{ fontSize: s.name }}>
                {c.name}
              </p>
              {c.tip.title && (
                <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <InfoTooltip
                    title={c.tip.title}
                    body={c.tip.body}
                    example={c.tip.example}
                    side={index === 0 ? "below" : "above"}
                  />
                </span>
              )}
            </div>
            <p className="text-[12px] tabular-nums text-foreground/45">
              {fmtNum(c.visits)} besök
            </p>
          </div>
        </div>

        {/* Besök — the bar.
            The fill has *square* corners and is clipped by the track's pill
            radius. Rounding the fill itself makes a narrow bar an ellipse once
            its radius exceeds half its width (a 2% channel on a 62px-tall row
            renders as a circle), and no radius arithmetic fixes that reliably
            because the track width is fluid. Clipping sidesteps it entirely:
            the left end always takes the track's curve, the right end stays
            flat, and a sliver reads as a sliver at every scale. */}
        <div className="relative flex-1">
          <div
            className="relative w-full overflow-hidden"
            style={{ background: "#F1F2F4", height: s.track, borderRadius: s.track / 2 }}
          >
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{ background: color, minWidth: c.pct > 0 ? 5 : 0 }}
              initial={reduced ? false : { width: "0%" }}
              animate={{ width: active ? `${c.pct}%` : "0%" }}
              transition={{
                duration: reduced ? 0 : 1.3,
                delay: stagger,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
            <NoiseTile blendMode="soft-light" opacity={0.3} />
          </div>
        </div>

        {/* Andel */}
        <p
          className="shrink-0 text-right font-stat font-bold leading-none tabular-nums"
          style={{ width: PCT_W, fontSize: s.stat }}
        >
          {c.pct}%
        </p>

        {/* Förändring */}
        <div className="shrink-0 text-right" style={{ width: DELTA_W }}>
          <TrendPill delta={sign(c.delta)} positive={(c.delta ?? 0) >= 0} size="sm" />
        </div>

        {/* Dedicated chevron — separating the toggle from the row body means the
            info tooltip and the expander never fight for the same click. */}
        <div className="flex shrink-0 justify-end" style={{ width: CHEV_W }}>
          {hasSubs && (
            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: "easeOut" }}
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: `${color}1A` }}
            >
              <ChevronDown className="h-3.5 w-3.5" style={{ color }} />
            </motion.span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5" style={{ paddingLeft: s.tile + 12 }}>
              {subs.map((sub, si) => (
                <SubRow key={sub.source} sub={sub} index={si} reduced={reduced} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SubRow({
  sub,
  index,
  reduced,
}: {
  sub: NonNullable<Channel["subChannels"]>[number];
  index: number;
  reduced: boolean;
}) {
  // Each network carries its own brand colour rather than a tint of the
  // parent's, so Facebook blue and Instagram pink stay distinguishable.
  const mark = networkMark(sub.source);

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={reduced ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : 0.06 + index * 0.05 }}
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${mark.color}1A` }}
      >
        <MarkGlyph mark={mark} size={14} title={sub.name} />
      </div>
      <p className="w-[104px] shrink-0 truncate text-[13px] font-medium text-foreground/75">
        {sub.name}
      </p>
      <div className="relative h-[8px] flex-1 overflow-hidden rounded-full" style={{ background: "#F1F2F4" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: mark.color }}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${sub.pct}%` }}
          transition={{
            duration: reduced ? 0 : 0.7,
            delay: reduced ? 0 : 0.12 + index * 0.05,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>
      <p className="w-[46px] shrink-0 text-right font-stat text-[13px] font-bold tabular-nums text-foreground/80">
        {sub.pct}%
      </p>
      <p className="w-[58px] shrink-0 text-right text-[12px] tabular-nums text-foreground/45">
        {fmtNum(sub.visits)}
      </p>
    </motion.div>
  );
}
