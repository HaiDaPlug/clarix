/* ------------------------------------------------------------------ *
 * Channel palette
 *
 * Deep editorial hues sitting with the report's warm paper base and its
 * charcoal/coral ink — deliberately not the six-hue rainbow this replaced.
 * "Premium" here is lightness, not greyness: every slot still clears the
 * OKLCH chroma floor, so the colours stay rich rather than washed out.
 *
 * Validated with the dataviz six checks on the slide's white surface, under
 * the all-pairs pairlist (any two channels can end up side by side in the
 * card grid, so adjacent-only would hide a collapse):
 *
 *   lightness band  PASS    chroma floor  PASS    contrast >= 3:1  PASS
 *   CVD separation  worst pair ΔE 8.0 deutan (burgundy vs bronze)
 *   normal vision   worst pair ΔE 15.6
 *
 * The 8.0 sits in the floor band, which is legal only alongside secondary
 * encoding — every channel here also carries its own icon, its full name and
 * a direct percentage label, so colour is never the only cue.
 *
 * Six is the ceiling, not a preference: no seventh hue clears the gates
 * without jumping to a bright, light tone that would out-shout the rest.
 *
 * Colour follows the channel, never its rank. Two clients with different
 * mixes — or the same client across two months — must not swap colours just
 * because the sort order moved.
 * ------------------------------------------------------------------ */

const TERRACOTTA = "#CC5449";
const BRONZE = "#7F5400";
const EMERALD = "#008B77";
const NAVY = "#1950A9";
const ORCHID = "#A55AB6";
const BURGUNDY = "#95204A";

/** Residual buckets. Deliberately uncoloured — an identity hue here would
 *  claim these are a channel rather than a leftover. */
const NEUTRAL = "#6B6760"; // --slate

/* Keyed on the display names the data layer emits (see slide-data.tsx).
 *
 * Seven channels want a colour and only six hues clear the gates, so the two
 * social channels share one. That is the pairing to spend, not a compromise:
 * organic and paid social are one family split by funding, so a reader seeing
 * two orchid cards reads "both social" — which is true. The alternatives were
 * worse. A seventh hue only exists as a second blue four degrees off the navy,
 * which reads as a mistake; and parking E-post on the residual grey made a real
 * marketing channel look like missing data next to six coloured cards. */
const CHANNEL_COLOR: Record<string, string> = {
  "Google (obetalt)": TERRACOTTA, // organic search — the brand-adjacent lead
  "Google Ads": BRONZE, // paid search — warm pair with organic search
  Direkttrafik: NAVY,
  Referral: EMERALD,
  "Sociala medier": ORCHID, // organic social ─┬─ one family, one hue
  "Betald social": ORCHID, //  paid social    ─┘
  "E-post": BURGUNDY,

  "Okänd trafik": NEUTRAL,
  "Övriga kanaler": NEUTRAL,
};

export function channelColor(name: string): string {
  return CHANNEL_COLOR[name] ?? NEUTRAL;
}
