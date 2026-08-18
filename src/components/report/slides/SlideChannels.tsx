"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { NoiseTile } from "@/components/ui/noise-tile";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { type SlideData } from "../slide-data";
import { fmtNum, sign, TrendPill } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

const CHANNEL_COLORS = [
  "#FF6B6B", // rose
  "#F59E0B", // amber
  "#6B8FFF", // blue
  "#34C759", // green
  "#A855F7", // purple
  "#F97316", // orange
];

const CARD_SHELL =
  "relative flex flex-col rounded-3xl border border-border bg-background/85 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(15,23,42,0.22)]";


type Channel = SlideData["topChannels"][number];
type SubChannel = NonNullable<Channel["subChannels"]>[number];

/* ------------------------------------------------------------------ *
 * The slide canvas is a fixed CANVAS_W×CANVAS_H with overflow:hidden
 * (SlideCard). Once SlideCard's py-12 and this slide's heading + gap are
 * subtracted, CHANNEL_AREA_H is what's left for the channel area.
 * Anything taller is clipped, not scrolled — so each channel count gets a
 * layout sized to fill that budget instead of one list that runs off the
 * bottom of the card at the top end.
 *
 * Row layouts (1, 3) have spare vertical room, so an expanded channel
 * grows in place. Grid layouts (2, 4, 5, 6) do not, so the card body
 * swaps to the breakdown at a fixed height. Both keep the same anatomy:
 * colour-tinted icon tile, font-stat percentage, grain-textured bar.
 * ------------------------------------------------------------------ */

export function SlideChannels({ d }: { d: SlideData }) {
  const { ref, active, reduced } = useSlideReveal();
  const [expanded, setExpanded] = useState<string | null>(null);

  const channels = d.topChannels;
  const toggle = (name: string) => setExpanded((cur) => (cur === name ? null : name));

  return (
    <div className="flex h-full flex-col gap-8">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub="Det här är källorna som driver flest besök till din sida.">
          Dina bästa trafikkällor
        </SlideHeading>
      </motion.div>

      {/* flex-1 + min-h-0: claims whatever the heading leaves rather than a
          hardcoded height, so the area tracks the canvas. The canvas clips
          rather than scrolls, so a layout that overflows this box loses
          content silently — data-channel-area gives the visual harness
          something to measure that against. */}
      <div ref={ref} data-channel-area className="min-h-0 flex-1">
        <ChannelLayout
          channels={channels}
          active={active}
          reduced={reduced}
          expanded={expanded}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}

type LayoutProps = {
  channels: Channel[];
  active: boolean;
  reduced: boolean;
  expanded: string | null;
  onToggle: (name: string) => void;
};

function ChannelLayout(props: LayoutProps) {
  switch (props.channels.length) {
    case 0:
      return null;
    case 1:
      return <HeroLayout {...props} />;
    case 2:
      return <DuoLayout {...props} />;
    case 3:
      return <RowsLayout {...props} />;
    case 4:
      return <QuadLayout {...props} />;
    case 5:
      return <FeatureLayout {...props} />;
    default:
      return <GridLayout {...props} />;
  }
}

/* ---------------------------- n = 1 ---------------------------- */
// One source means the bar is always 100% and says nothing. Drop it and let
// the number carry the slide; the breakdown sits open because there is no
// competing content and nothing to toggle against.

function HeroLayout({ channels, active, reduced }: LayoutProps) {
  const c = channels[0];
  const Icon = c.icon;
  const color = CHANNEL_COLORS[0];
  const subs = c.subChannels ?? [];

  return (
    <motion.div
      className={`${CARD_SHELL} h-full justify-center overflow-hidden px-14 py-12`}
      {...fadeUp(active, reduced, { y: 18, delay: 0.2 })}
    >
      <div className="flex items-center gap-10">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px]"
          style={{ background: `${color}20` }}
        >
          <Icon className="h-10 w-10" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[30px] font-semibold leading-tight">{c.name}</p>
            {c.tip.title && (
              <InfoTooltip title={c.tip.title} body={c.tip.body} example={c.tip.example} side="above" />
            )}
          </div>
          <p className="mt-2 text-[19px] leading-relaxed text-foreground/55">{c.sub}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-stat text-[6rem] font-bold leading-none tracking-tight tabular-nums">
            {c.pct}%
          </p>
          <div className="mt-3 flex items-center justify-end gap-3">
            <span className="text-[17px] tabular-nums text-foreground/55">
              {fmtNum(c.visits)} besök
            </span>
            <TrendPill delta={sign(c.delta)} positive={(c.delta ?? 0) >= 0} size="md" />
          </div>
        </div>
      </div>

      {subs.length > 0 && (
        <div className="mt-12 border-t border-border/70 pt-8">
          <SubHeader color={color} />
          <div className="mt-5 grid grid-cols-4 gap-4">
            {subs.slice(0, 4).map((sub) => (
              <SubTile key={sub.source} sub={sub} color={color} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ---------------------------- n = 2 ---------------------------- */
// Two tall cards side by side. Enough height for full-size stats, so this
// reads as a direct head-to-head rather than a truncated list.

function DuoLayout({ channels, active, reduced, expanded, onToggle }: LayoutProps) {
  // Two cards stretched to the full area read as padded-out rather than
  // designed. Cap the height and centre the pair instead — kept as a ratio of
  // the area so the pair stays deliberately short of it on any canvas.
  return (
    <div
      className="grid h-full grid-cols-2 items-center gap-6"
      style={{ gridTemplateRows: "83%" }}
    >
      {channels.map((c, i) => (
        <ChannelCard
          key={c.name}
          channel={c}
          color={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
          size="lg"
          index={i}
          active={active}
          reduced={reduced}
          isExpanded={expanded === c.name}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/* ---------------------------- n = 3 ---------------------------- */
// The classic bar list, given room to breathe: taller tracks and wider gaps
// than a cramped six-row version would allow. Expanding grows in place.

function RowsLayout({ channels, active, reduced, expanded, onToggle }: LayoutProps) {
  return (
    <div className="flex h-full flex-col justify-center gap-10">
      {channels.map((c, i) => (
        <ChannelBarRow
          key={c.name}
          channel={c}
          color={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
          index={i}
          active={active}
          reduced={reduced}
          isExpanded={expanded === c.name}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/* ---------------------------- n = 4 ---------------------------- */
// Even 2×2 — four equal cards, each the same weight as the others.

function QuadLayout({ channels, active, reduced, expanded, onToggle }: LayoutProps) {
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-6">
      {channels.map((c, i) => (
        <ChannelCard
          key={c.name}
          channel={c}
          color={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
          size="md"
          index={i}
          active={active}
          reduced={reduced}
          isExpanded={expanded === c.name}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/* ---------------------------- n = 5 ---------------------------- */
// Five refuses to split evenly, so lean into it: the leading channel takes a
// full-height feature column and the other four fill a 2×2 beside it. Uses the
// `featured` flag the data layer already sets on the biggest channel.

function FeatureLayout({ channels, active, reduced, expanded, onToggle }: LayoutProps) {
  const [lead, ...rest] = channels;

  return (
    <div className="grid h-full grid-cols-3 grid-rows-2 gap-6">
      <div className="col-span-1 row-span-2 min-h-0">
        <ChannelCard
          channel={lead}
          color={CHANNEL_COLORS[0]}
          size="lg"
          index={0}
          active={active}
          reduced={reduced}
          isExpanded={expanded === lead.name}
          onToggle={onToggle}
        />
      </div>
      {rest.map((c, i) => (
        <ChannelCard
          key={c.name}
          channel={c}
          color={CHANNEL_COLORS[(i + 1) % CHANNEL_COLORS.length]}
          size="sm"
          index={i + 1}
          active={active}
          reduced={reduced}
          isExpanded={expanded === c.name}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/* ---------------------------- n = 6 ---------------------------- */
// Six equal cards on a 3×2. The ceiling — anything beyond this arrives
// pre-rolled into a single "Övriga kanaler" row by the data layer.

function GridLayout({ channels, active, reduced, expanded, onToggle }: LayoutProps) {
  return (
    <div className="grid h-full grid-cols-3 grid-rows-2 gap-6">
      {channels.map((c, i) => (
        <ChannelCard
          key={c.name}
          channel={c}
          color={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
          size="sm"
          index={i}
          active={active}
          reduced={reduced}
          isExpanded={expanded === c.name}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

/* ------------------------- shared pieces ------------------------- */

// `sub` (the plain-language description) only renders where there is width and
// height for it — on the small 3×2 cards it would wrap to three lines and crowd
// the stat. Tall cards get the bigger stat so the extra height reads as
// deliberate scale rather than empty space.
const SIZES = {
  sm: { pad: "p-5", tile: "h-9 w-9", icon: "h-[15px] w-[15px]", name: "text-[15px]", stat: "text-[2.4rem]", meta: "text-[12px]", sub: null },
  md: { pad: "p-6", tile: "h-11 w-11", icon: "h-[18px] w-[18px]", name: "text-[18px]", stat: "text-[3.4rem]", meta: "text-[13px]", sub: "text-[13px]" },
  lg: { pad: "p-8", tile: "h-14 w-14", icon: "h-6 w-6", name: "text-[22px]", stat: "text-[5rem]", meta: "text-[14px]", sub: "text-[15px]" },
} as const;

function ChannelCard({
  channel: c,
  color,
  size,
  index,
  active,
  reduced,
  isExpanded,
  onToggle,
}: {
  channel: Channel;
  color: string;
  size: keyof typeof SIZES;
  index: number;
  active: boolean;
  reduced: boolean;
  isExpanded: boolean;
  onToggle: (name: string) => void;
}) {
  const Icon = c.icon;
  const s = SIZES[size];
  const subs = c.subChannels ?? [];
  const hasSubs = subs.length > 0;
  const open = hasSubs && isExpanded;

  return (
    <motion.div
      className={`${CARD_SHELL} ${s.pad} h-full min-h-0 overflow-hidden ${hasSubs ? "cursor-pointer" : ""}`}
      {...fadeUp(active, reduced, { y: 16, delay: 0.2 + index * 0.09 })}
      role={hasSubs ? "button" : undefined}
      tabIndex={hasSubs ? 0 : undefined}
      aria-expanded={hasSubs ? open : undefined}
      onClick={hasSubs ? () => onToggle(c.name) : undefined}
      onKeyDown={
        hasSubs
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(c.name);
              }
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex ${s.tile} shrink-0 items-center justify-center rounded-xl`}
          style={{ background: `${color}20` }}
        >
          <Icon className={s.icon} style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={`truncate ${s.name} font-semibold leading-tight`}>{c.name}</p>
            {c.tip.title && (
              // Stop the click here: the tooltip sits inside the card's own
              // toggle target, so without this, reading the definition would
              // also flip the card to its breakdown.
              <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <InfoTooltip title={c.tip.title} body={c.tip.body} example={c.tip.example} side="above" />
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
          {s.sub && c.sub && (
            <p className={`mt-1.5 ${s.sub} leading-snug text-foreground/50`}>{c.sub}</p>
          )}
        </div>
      </div>

      {/* Fixed-height body: the breakdown replaces the stat rather than pushing
          the grid taller, which the clipped canvas would cut off. Centred, not
          bottom-pinned — on a full-height feature card the leftover space would
          otherwise all pool above the number and read as an unfinished card. */}
      <div className="relative mt-4 min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="subs"
              className="absolute inset-0 flex flex-col justify-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <SubHeader color={color} />
              <div className="mt-3 space-y-2">
                {subs.map((sub) => (
                  <SubRow key={sub.source} sub={sub} color={color} dense={size === "sm"} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="stat"
              className="absolute inset-0 flex flex-col justify-center"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className={`font-stat ${s.stat} font-bold leading-none tracking-tight tabular-nums`}>
                {c.pct}%
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className={`${s.meta} tabular-nums text-foreground/55`}>
                  {fmtNum(c.visits)} besök
                </span>
                <TrendPill delta={sign(c.delta)} positive={(c.delta ?? 0) >= 0} size="sm" />
              </div>
              <div
                className="relative mt-3 h-2 w-full overflow-hidden rounded-full"
                style={{ background: "#F1F2F4" }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: color }}
                  initial={reduced ? false : { width: "0%" }}
                  animate={{ width: active ? `${c.pct}%` : "0%" }}
                  transition={{
                    duration: reduced ? 0 : 1.2,
                    delay: reduced ? 0 : 0.3 + index * 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
                <NoiseTile blendMode="soft-light" opacity={0.3} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ChannelBarRow({
  channel: c,
  color,
  index,
  active,
  reduced,
  isExpanded,
  onToggle,
}: {
  channel: Channel;
  color: string;
  index: number;
  active: boolean;
  reduced: boolean;
  isExpanded: boolean;
  onToggle: (name: string) => void;
}) {
  const Icon = c.icon;
  const subs = c.subChannels ?? [];
  const hasSubs = subs.length > 0;
  const open = hasSubs && isExpanded;
  const stagger = reduced ? 0 : index * 0.12;

  return (
    <div>
      <div
        className={`flex items-center gap-5 ${hasSubs ? "cursor-pointer" : ""}`}
        role={hasSubs ? "button" : undefined}
        tabIndex={hasSubs ? 0 : undefined}
        aria-expanded={hasSubs ? open : undefined}
        onClick={hasSubs ? () => onToggle(c.name) : undefined}
        onKeyDown={
          hasSubs
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(c.name);
                }
              }
            : undefined
        }
      >
        <div className="flex w-[220px] shrink-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${color}20` }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[17px] font-semibold leading-tight">{c.name}</p>
              {c.tip.title && (
                <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <InfoTooltip title={c.tip.title} body={c.tip.body} example={c.tip.example} side="above" />
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
            <motion.p
              className="text-[13px] tabular-nums text-foreground/50"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: active ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : stagger + 0.9 }}
            >
              {fmtNum(c.visits)} besök
            </motion.p>
          </div>
        </div>

        <div className="relative flex-1">
          <div
            className="relative h-[52px] w-full overflow-hidden rounded-[12px]"
            style={{ background: "#F1F2F4" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 overflow-hidden rounded-r-[10px]"
              style={{ background: color }}
              initial={reduced ? false : { width: "0%" }}
              animate={{ width: active ? `${c.pct}%` : "0%" }}
              transition={{ duration: reduced ? 0 : 1.5, delay: stagger, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Grain on the static track (not the animating fill) so the tile isn't re-rasterized every frame */}
            <NoiseTile blendMode="soft-light" opacity={0.3} />
          </div>

          <motion.div
            className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2"
            style={{ left: `calc(${c.pct}% + 12px)` }}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: active ? 1 : 0, x: active ? 0 : reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : stagger + 0.85, ease: "easeOut" }}
          >
            <p className="font-stat text-[30px] font-bold leading-none tabular-nums">{c.pct}%</p>
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
              className="ml-[60px] mt-4 space-y-2.5 border-l-2 pl-6"
              style={{ borderColor: `${color}30` }}
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
}

function SubHeader({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
        Fördelning per nätverk
      </p>
    </div>
  );
}

function SubRow({ sub, color, dense }: { sub: SubChannel; color: string; dense?: boolean }) {
  const Icon = sub.icon;
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
      <p
        className={`${dense ? "w-[74px] text-[12px]" : "w-[110px] text-[13px]"} shrink-0 truncate font-medium text-foreground/70`}
      >
        {sub.name}
      </p>
      <div className="relative h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: "#F1F2F4" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${sub.pct}%`, background: `${color}99` }}
        />
      </div>
      <p
        className={`${dense ? "w-[34px] text-[12px]" : "w-[42px] text-[13px]"} shrink-0 text-right font-stat font-bold tabular-nums text-foreground/70`}
      >
        {sub.pct}%
      </p>
      {!dense && (
        <p className="w-[62px] shrink-0 text-right text-[12px] tabular-nums text-foreground/45">
          {fmtNum(sub.visits)}
        </p>
      )}
    </div>
  );
}

function SubTile({ sub, color }: { sub: SubChannel; color: string }) {
  const Icon = sub.icon;
  return (
    <div className="rounded-2xl border border-border/70 px-5 py-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
        <p className="truncate text-[14px] font-medium text-foreground/70">{sub.name}</p>
      </div>
      <p className="mt-2 font-stat text-[2rem] font-bold leading-none tabular-nums">{sub.pct}%</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[12px] tabular-nums text-foreground/45">{fmtNum(sub.visits)}</span>
        {sub.delta !== null && (
          <TrendPill delta={sign(sub.delta)} positive={sub.delta >= 0} size="sm" />
        )}
      </div>
    </div>
  );
}
