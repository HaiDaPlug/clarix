/* ────────────────────────────────────────────────────────────────────────────
 * Brand marks for traffic channels and paid-social networks.
 *
 * THIS IS THE SWAP POINT. Every icon and brand colour the channels slide draws
 * comes from the two maps below, keyed on the canonical source/channel string
 * the mapper already emits (see normalizeSource in ga4-mapper.ts). To move from
 * placeholder icons to real artwork, set `logo` on an entry — nothing else in
 * the slide, the mobile deck or the data layer changes.
 *
 *   1. drop the SVG in public/brands/ (e.g. public/brands/facebook.svg)
 *   2. set   logo: "/brands/facebook.svg"   on that entry
 *
 * `color` is the brand colour used for the icon tile tint and the network's own
 * bar. It is deliberately separate from CHANNEL_COLORS (the slide's rotating
 * palette) so a swapped logo and its bar always agree.
 * ──────────────────────────────────────────────────────────────────────────── */

import {
  Camera,
  Ghost,
  Globe,
  Link2,
  Mail,
  Megaphone,
  MousePointerClick,
  PlaySquare,
  Music2,
  Search as SearchIcon,
  ThumbsUp,
  AtSign,
} from "lucide-react";

export type ChannelMark = {
  /** Path under public/ to a brand SVG. When set, it replaces `icon`. */
  logo?: string;
  /** Placeholder until `logo` is supplied. */
  icon: React.ElementType;
  /** Brand colour — tints the icon tile and colours this row's bar. */
  color: string;
  /** Fill for stacked segments, where networks sit directly against each other.
   *  Official brand colours are picked for standalone logos on white, not for
   *  adjacency: Facebook #1877F2 and LinkedIn #0A66C2 are 4° apart in hue and
   *  merge into one band, while TikTok #010101 reads as a hole punched in the
   *  chart. Set this to keep the brand recognisable but separable. Falls back
   *  to `color` where the brand colour already stands on its own. */
  segment?: string;
};

/** Colour to fill a stacked segment with. */
export function segmentColor(mark: ChannelMark): string {
  return mark.segment ?? mark.color;
}

/** Paid-social networks, keyed on the mapper's canonical source. */
export const NETWORK_MARKS: Record<string, ChannelMark> = {
  // Facebook keeps its blue; LinkedIn moves to a deep teal-navy so the two are
  // no longer 4° apart, and TikTok trades near-black for its own cyan accent —
  // still unmistakably TikTok, but it no longer reads as a gap in the column.
  facebook: { icon: ThumbsUp, color: "#1877F2", segment: "#1877F2" },
  instagram: { icon: Camera, color: "#E4405F", segment: "#E4405F" },
  linkedin: { icon: Link2, color: "#0A66C2", segment: "#0E7490" },
  tiktok: { icon: Music2, color: "#010101", segment: "#22C1CC" },
  snapchat: { icon: Ghost, color: "#FFFC00", segment: "#EAB308" },
  pinterest: { icon: Camera, color: "#BD081C", segment: "#9F1239" },
  x: { icon: AtSign, color: "#000000", segment: "#475569" },
  youtube: { icon: PlaySquare, color: "#FF0000", segment: "#DC2626" },
  reddit: { icon: Globe, color: "#FF4500", segment: "#F97316" },
  other: { icon: Globe, color: "#8B8B8B", segment: "#94A3B8" },
};

const FALLBACK_NETWORK: ChannelMark = { icon: Globe, color: "#8B8B8B" };

export function networkMark(source: string): ChannelMark {
  return NETWORK_MARKS[source] ?? FALLBACK_NETWORK;
}

/** Top-level channels. Keyed on both the raw GA4 group and the Swedish label
 *  the mapper localises to, matching the existing channelNames convention. */
export const CHANNEL_MARKS: Record<string, ChannelMark> = {
  "Organic Search": { icon: SearchIcon, color: "#EA4335" },
  "Organisk sökning": { icon: SearchIcon, color: "#EA4335" },
  "Google (obetalt)": { icon: SearchIcon, color: "#EA4335" },
  "Paid Search": { icon: Globe, color: "#F9AB00" },
  "Betald sökning": { icon: Globe, color: "#F9AB00" },
  "Google Ads": { icon: Globe, color: "#F9AB00" },
  "Paid Social": { icon: Megaphone, color: "#6B8FFF" },
  "Betald social": { icon: Megaphone, color: "#6B8FFF" },
  "Organic Social": { icon: Megaphone, color: "#A855F7" },
  "Sociala medier": { icon: Megaphone, color: "#A855F7" },
  Direct: { icon: MousePointerClick, color: "#34C759" },
  Direkt: { icon: MousePointerClick, color: "#34C759" },
  Direkttrafik: { icon: MousePointerClick, color: "#34C759" },
  Referral: { icon: Globe, color: "#14B8A6" },
  Hänvisningar: { icon: Globe, color: "#14B8A6" },
  Email: { icon: Mail, color: "#A855F7" },
  "E-post": { icon: Mail, color: "#A855F7" },
  "Övriga kanaler": { icon: Globe, color: "#9AA0A6" },
  Övrigt: { icon: Globe, color: "#9AA0A6" },
};

export function channelMark(name: string): ChannelMark | undefined {
  return CHANNEL_MARKS[name];
}

/** Renders a mark as artwork when a logo is set, else the placeholder icon.
 *  `size` drives both branches so swapping a logo in never shifts the layout. */
export function MarkGlyph({
  mark,
  size,
  className,
  title,
}: {
  mark: ChannelMark;
  size: number;
  className?: string;
  title?: string;
}) {
  if (mark.logo) {
    return (
      // Brand SVGs are static local assets at a fixed small size; next/image
      // adds a loader and layout wrapper for no benefit here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mark.logo}
        alt={title ?? ""}
        className={className}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  const Icon = mark.icon;
  return <Icon className={className} style={{ color: mark.color, width: size, height: size }} />;
}
