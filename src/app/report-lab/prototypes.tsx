"use client";

/* ────────────────────────────────────────────────────────────────────────────
 * THROWAWAY — two candidate redesigns of the channels slide, for comparison
 * against the shipping card version. Nothing here is imported by the app.
 *
 *   A. Bar rows at every count — one idiom, row height scales with n,
 *      expansion always grows in place.
 *   B. Stacked bar + detail rail — a single 100% bar as the whole-traffic
 *      picture, with a ranked list beneath.
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

const CHANNEL_COLORS = ["#FF6B6B", "#F59E0B", "#6B8FFF", "#34C759", "#A855F7", "#F97316"];

type Channel = SlideData["topChannels"][number];
type SubChannel = NonNullable<Channel["subChannels"]>[number];

/* ═══════════════════════════════════════════════════════════════════════════
 * A — Bar rows at every count
 *
 * The row anatomy never changes; only its scale does. Fewer channels means a
 * taller track and larger type, so n=2 reads as deliberate rather than a list
 * that ran out. Because rows stack vertically there is always somewhere for an
 * expanded breakdown to go — no swap, no clipping, no overlap.
 * ═══════════════════════════════════════════════════════════════════════════ */

// Tuned so bars + gaps + a 5-row breakdown still fit the 484px channel area.
const ROW_SCALE = {
  1: { track: 96, gap: 0, name: 26, stat: 46, tile: 64, tileIcon: 26 },
  2: { track: 84, gap: 48, name: 23, stat: 42, tile: 56, tileIcon: 23 },
  3: { track: 68, gap: 36, name: 20, stat: 36, tile: 48, tileIcon: 20 },
  4: { track: 54, gap: 26, name: 18, stat: 31, tile: 42, tileIcon: 18 },
  5: { track: 44, gap: 20, name: 16, stat: 27, tile: 36, tileIcon: 16 },
  6: { track: 38, gap: 15, name: 15, stat: 24, tile: 32, tileIcon: 15 },
} as const;

export function ProtoBarRows({ d }: { d: SlideData }) {
  const { ref, active, reduced } = useSlideReveal();
  const [expanded, setExpanded] = useState<string | null>(null);

  const channels = d.topChannels;
  const n = Math.min(Math.max(channels.length, 1), 6) as keyof typeof ROW_SCALE;
  const s = ROW_SCALE[n];

  return (
    <div className="space-y-8">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
          Dina bästa trafikkällor
        </SlideHeading>
      </motion.div>

      <div
        ref={ref}
        data-channel-area
        className="flex h-[484px] flex-col justify-center"
        style={{ gap: s.gap }}
      >
        {channels.map((c, i) => {
          const Icon = c.icon;
          const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length];
          const subs = c.subChannels ?? [];
          const hasSubs = subs.length > 0;
          const open = hasSubs && expanded === c.name;
          const stagger = reduced ? 0 : i * 0.1;

          return (
            <div key={c.name}>
              <div
                className={`flex items-center gap-5 ${hasSubs ? "cursor-pointer" : ""}`}
                role={hasSubs ? "button" : undefined}
                tabIndex={hasSubs ? 0 : undefined}
                aria-expanded={hasSubs ? open : undefined}
                onClick={hasSubs ? () => setExpanded(open ? null : c.name) : undefined}
                onKeyDown={
                  hasSubs
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpanded(open ? null : c.name);
                        }
                      }
                    : undefined
                }
              >
                <div className="flex w-[230px] shrink-0 items-center gap-3">
                  <div
                    className="flex shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${color}20`, width: s.tile, height: s.tile }}
                  >
                    <Icon style={{ color, width: s.tileIcon, height: s.tileIcon }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className="truncate font-semibold leading-tight"
                        style={{ fontSize: s.name }}
                      >
                        {c.name}
                      </p>
                      {c.tip.title && (
                        <span
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <InfoTooltip
                            title={c.tip.title}
                            body={c.tip.body}
                            example={c.tip.example}
                            side={i === 0 ? "below" : "above"}
                          />
                        </span>
                      )}
                      {hasSubs && (
                        <motion.span
                          animate={{ rotate: open ? 180 : 0 }}
                          transition={{ duration: reduced ? 0 : 0.25, ease: "easeOut" }}
                          className="flex h-4 w-4 shrink-0 items-center justify-center"
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-foreground/40" />
                        </motion.span>
                      )}
                    </div>
                    <p className="text-[13px] tabular-nums text-foreground/50">
                      {fmtNum(c.visits)} besök
                    </p>
                  </div>
                </div>

                <div className="relative flex-1">
                  <div
                    className="relative w-full overflow-hidden rounded-[12px]"
                    style={{ background: "#F1F2F4", height: s.track }}
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-r-[10px]"
                      style={{ background: color }}
                      initial={reduced ? false : { width: "0%" }}
                      animate={{ width: active ? `${c.pct}%` : "0%" }}
                      transition={{
                        duration: reduced ? 0 : 1.4,
                        delay: stagger,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                    <NoiseTile blendMode="soft-light" opacity={0.3} />
                  </div>

                  <motion.div
                    className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2"
                    style={{ left: `calc(${c.pct}% + 12px)` }}
                    initial={reduced ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: active ? 1 : 0, x: active ? 0 : reduced ? 0 : -8 }}
                    transition={{
                      duration: reduced ? 0 : 0.35,
                      delay: reduced ? 0 : stagger + 0.8,
                      ease: "easeOut",
                    }}
                  >
                    <p
                      className="font-stat font-bold leading-none tabular-nums"
                      style={{ fontSize: s.stat }}
                    >
                      {c.pct}%
                    </p>
                    <TrendPill delta={sign(c.delta)} positive={(c.delta ?? 0) >= 0} size="sm" />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-3 space-y-2 border-l-2 pl-6"
                      style={{ marginLeft: s.tile + 12, borderColor: `${color}35` }}
                    >
                      {subs.map((sub) => (
                        <SubRow key={sub.source} sub={sub} color={color} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubRow({ sub, color }: { sub: SubChannel; color: string }) {
  const Icon = sub.icon;
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
      <p className="w-[110px] shrink-0 truncate text-[13px] font-medium text-foreground/70">
        {sub.name}
      </p>
      <div
        className="relative h-[6px] flex-1 overflow-hidden rounded-full"
        style={{ background: "#F1F2F4" }}
      >
        <div className="h-full rounded-full" style={{ width: `${sub.pct}%`, background: `${color}99` }} />
      </div>
      <p className="w-[42px] shrink-0 text-right font-stat text-[13px] font-bold tabular-nums text-foreground/70">
        {sub.pct}%
      </p>
      <p className="w-[62px] shrink-0 text-right text-[12px] tabular-nums text-foreground/45">
        {fmtNum(sub.visits)}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * B — Stacked bar + detail rail
 *
 * One 100% stacked bar answers "where does my traffic come from" in a single
 * glance, which the per-row bars never quite do — you have to read six numbers
 * and add them up. The ranked list beneath carries the detail. Selecting a row
 * highlights its segment; a channel with networks expands inline.
 * ═══════════════════════════════════════════════════════════════════════════ */

export function ProtoStackedRail({ d }: { d: SlideData }) {
  const { ref, active, reduced } = useSlideReveal();
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const channels = d.topChannels;
  // An open breakdown adds ~5 rows to a rail that is already full at 6 channels.
  // Rather than let it clip, the unselected rows compact while one is open: the
  // reader is looking at the detail in that moment, not comparing the others.
  // Compact whenever an open breakdown would not otherwise fit, judged by the
  // rows it adds rather than by channel count — 4 channels with a 5-row
  // breakdown overflows just as readily as 6 channels with a 4-row one.
  const openSubCount = channels.find((c) => c.name === expanded)?.subChannels?.length ?? 0;
  const anyOpen = expanded !== null;
  const dense = anyOpen && channels.length + openSubCount > 8;
  const rowGap = dense ? 0 : channels.length > 4 ? 8 : 14;
  const barHeight = dense ? 40 : 68;
  const rowPad = dense ? "px-3 py-0.5" : "px-3 py-2";
  const showLegend = !dense;

  return (
    <div className="space-y-8">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
          Dina bästa trafikkällor
        </SlideHeading>
      </motion.div>

      <div ref={ref} data-channel-area className="flex h-[484px] flex-col">
        {/* Whole-traffic bar */}
        <div className="shrink-0">
          <motion.div
            className="relative flex w-full overflow-hidden rounded-[14px]"
            style={{ background: "#F1F2F4" }}
            animate={{ height: barHeight }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {channels.map((c, i) => {
              const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length];
              const dim = selected !== null && selected !== c.name;
              return (
                <motion.div
                  key={c.name}
                  className="relative h-full"
                  style={{ background: color }}
                  initial={reduced ? false : { width: 0 }}
                  animate={{
                    width: active ? `${c.pct}%` : 0,
                    opacity: dim ? 0.28 : 1,
                  }}
                  transition={{
                    width: {
                      duration: reduced ? 0 : 1.3,
                      delay: reduced ? 0 : 0.15 + i * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    opacity: { duration: 0.25 },
                  }}
                >
                  {/* Percentage sits inside its own segment when it fits */}
                  {c.pct >= 9 && (
                    <motion.span
                      className="absolute inset-0 flex items-center justify-center font-stat text-[19px] font-bold tabular-nums text-white"
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: active ? 1 : 0 }}
                      transition={{ duration: 0.3, delay: reduced ? 0 : 1.1 + i * 0.05 }}
                    >
                      {c.pct}%
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
            <NoiseTile blendMode="soft-light" opacity={0.3} />
          </motion.div>

          <div
            className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 overflow-hidden transition-all duration-300"
            style={{ height: showLegend ? 20 : 0, opacity: showLegend ? 1 : 0, marginTop: showLegend ? 12 : 0 }}
          >
            {channels.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }}
                />
                <span className="text-[13px] text-foreground/55">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranked detail rail */}
        <div
          className="mt-7 flex min-h-0 flex-1 flex-col"
          style={{ gap: rowGap }}
        >
          {channels.map((c, i) => {
            const Icon = c.icon;
            const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length];
            const subs = c.subChannels ?? [];
            const hasSubs = subs.length > 0;
            const open = hasSubs && expanded === c.name;

            return (
              <div key={c.name}>
                <motion.div
                  className={`flex items-center gap-4 rounded-xl ${rowPad} ${hasSubs ? "cursor-pointer" : ""}`}
                  onHoverStart={() => setSelected(c.name)}
                  onHoverEnd={() => setSelected(null)}
                  // Merge the reveal with the hover highlight by hand — spreading
                  // fadeUp() after `animate` would silently drop the background.
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{
                    opacity: active ? 1 : 0,
                    y: active ? 0 : reduced ? 0 : 10,
                    backgroundColor: selected === c.name ? `${color}12` : "rgba(0,0,0,0)",
                  }}
                  transition={{
                    opacity: { duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.4 + i * 0.07 },
                    y: { duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.4 + i * 0.07 },
                    backgroundColor: { duration: 0.2 },
                  }}
                  role={hasSubs ? "button" : undefined}
                  tabIndex={hasSubs ? 0 : undefined}
                  aria-expanded={hasSubs ? open : undefined}
                  onClick={hasSubs ? () => setExpanded(open ? null : c.name) : undefined}
                  onKeyDown={
                    hasSubs
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpanded(open ? null : c.name);
                          }
                        }
                      : undefined
                  }
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${color}20` }}
                  >
                    <Icon className="h-[15px] w-[15px]" style={{ color }} />
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <p className="truncate text-[17px] font-semibold">{c.name}</p>
                    {c.tip.title && (
                      <span
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <InfoTooltip
                          title={c.tip.title}
                          body={c.tip.body}
                          example={c.tip.example}
                          side={i === 0 ? "below" : "above"}
                        />
                      </span>
                    )}
                    {hasSubs && (
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: reduced ? 0 : 0.25, ease: "easeOut" }}
                        className="flex h-4 w-4 shrink-0 items-center justify-center"
                      >
                        <ChevronDown className="h-3.5 w-3.5 text-foreground/40" />
                      </motion.span>
                    )}
                  </div>

                  <p className="w-[92px] shrink-0 text-right text-[14px] tabular-nums text-foreground/55">
                    {fmtNum(c.visits)}
                  </p>
                  <p className="w-[64px] shrink-0 text-right font-stat text-[24px] font-bold leading-none tabular-nums">
                    {c.pct}%
                  </p>
                  <div className="w-[86px] shrink-0 text-right">
                    <TrendPill delta={sign(c.delta)} positive={(c.delta ?? 0) >= 0} size="sm" />
                  </div>
                </motion.div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div
                        className="ml-[60px] mt-2 space-y-2 border-l-2 pl-5"
                        style={{ borderColor: `${color}35` }}
                      >
                        {subs.map((sub) => (
                          <SubRow key={sub.source} sub={sub} color={color} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
