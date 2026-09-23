/* ------------------------------------------------------------------ *
 * Channel palette
 *
 * Six jewel hues with a warm lead, so the traffic chart reads as Clarix and
 * not as "brand colours, dimmed". The earlier set was pushed dark enough to
 * clear 3:1 on white without help, which is what made it look muddy (bronze
 * in particular). This set keeps chroma high on every slot and separates the
 * hues by lightness instead, which is also what carries them for colour-blind
 * readers. Two light slots sit under 3:1 on white by design: the dataviz
 * method permits that when every mark has a visible label, and every channel
 * here always carries its name, its value and its share, so colour is never
 * the only cue.
 *
 * Dark mode is its own set of steps from the same hues, not an automatic
 * flip — the dark band is narrower, so the steps were chosen separately.
 *
 * Validated with the dataviz six checks under the all-pairs pairlist (any two
 * channels can sit side by side in the card grid or as donut neighbours):
 *
 *   light, on #ffffff:  band PASS · chroma PASS · CVD worst pair ΔE 9.7
 *                       (violet↔navy, protan) · normal vision worst 18.7
 *                       · contrast WARN gold 2.19:1, teal 2.67:1 → relief is
 *                       the direct labels
 *   dark, on #1c1a18:   band PASS · chroma PASS · CVD worst pair ΔE 8.4
 *                       (violet↔navy, protan) · normal vision worst 15.7
 *                       · contrast WARN navy 2.72:1, plum 2.47:1 → same relief
 *
 * Six is the ceiling: no seventh hue clears the gates at this floor.
 *
 * Colour follows the channel, never its rank. Two clients with different
 * mixes — or the same client across two months — must not swap colours just
 * because the sort order moved.
 * ------------------------------------------------------------------ */

export type ChannelKey =
  | "organic"
  | "paid"
  | "direct"
  | "referral"
  | "social"
  | "paid-social"
  | "email"
  | "unassigned"
  | "other";

export type ChannelTheme = "light" | "dark";

type Hues = { organic: string; paid: string; direct: string; referral: string; social: string; email: string };

// oklch(0.64 0.19 30) · (0.76 0.16 78) · (0.46 0.17 262) · (0.68 0.14 175) · (0.62 0.19 315) · (0.45 0.17 350)
const LIGHT: Hues = {
  organic: "#E9523F", // coral — the brand-adjacent lead
  paid: "#E8A200", // gold — warm pair with organic search
  direct: "#1C50B5", // royal blue
  referral: "#00B393", // teal
  social: "#B05AD3", // orchid
  email: "#941862", // plum
};

// oklch(0.58 0.18 28) · (0.665 0.15 95) · (0.49 0.16 255) · (0.65 0.12 172) · (0.63 0.16 320) · (0.485 0.16 345)
const DARK: Hues = {
  organic: "#CF4238",
  paid: "#B19100",
  direct: "#025EB8",
  referral: "#1DA687",
  social: "#B365C4",
  email: "#992E73",
};

/** Residual buckets. Deliberately uncoloured — an identity hue here would
 *  claim these are a channel rather than a leftover. */
const NEUTRAL: Record<ChannelTheme, string> = { light: "#6B6760", dark: "#8A867F" };

/* Seven channels want a colour and only six hues clear the gates, so the two
 * social channels share one. That is the pairing to spend, not a compromise:
 * organic and paid social are one family split by funding, so a reader seeing
 * two orchid marks reads "both social" — which is true. */
const KEY_TO_HUE: Record<ChannelKey, keyof Hues | null> = {
  organic: "organic",
  paid: "paid",
  direct: "direct",
  referral: "referral",
  social: "social",
  "paid-social": "social",
  email: "email",
  unassigned: null,
  other: null,
};

/* Keyed on the display names the data layer emits (see slide-data.tsx). */
const NAME_TO_KEY: Record<string, ChannelKey> = {
  "Google (obetalt)": "organic",
  "Google Ads": "paid",
  Direkttrafik: "direct",
  Referral: "referral",
  "Sociala medier": "social",
  "Betald social": "paid-social",
  "E-post": "email",
  "Okänd trafik": "unassigned",
  "Övriga kanaler": "other",
};

export function channelColorByKey(key: string, theme: ChannelTheme = "light"): string {
  const hue = KEY_TO_HUE[key as ChannelKey];
  if (!hue) return NEUTRAL[theme];
  return (theme === "dark" ? DARK : LIGHT)[hue];
}

export function channelColor(name: string, theme: ChannelTheme = "light"): string {
  const key = NAME_TO_KEY[name];
  return key ? channelColorByKey(key, theme) : NEUTRAL[theme];
}
