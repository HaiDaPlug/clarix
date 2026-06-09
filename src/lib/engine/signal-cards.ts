import type { Insight, InsightType, InsightSeverity } from "./derive-insights";

// ─── Signal cards ───────────────────────────────────────────────────────────
// Powers the three "signal" cards on the strategic-insight slide. These are
// short, glanceable statements of what changed — NOT prose. Copy is fully
// deterministic and templated from the classifier's metrics, so a card can
// never contradict the numbers in the report. (The analytical right-hand card
// is LLM-written; these are not.)
//
// Each entry maps an InsightType to a label + a body builder. The body builder
// receives the insight's metrics and injects the real figures. Mirror the
// reasoning-rule pattern in generate-insights/route.ts: only types that can
// actually surface here need an entry.

export interface SignalCard {
  label: string;
  body: string;
  positive: boolean;
}

type Metrics = Insight["metrics"];

// Format a signed percentage delta from metrics (e.g. 7 → "7 %", -7 → "7 %").
// Cards phrase direction in words ("ökar"/"minskar"), so we use the magnitude.
function absPct(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? Math.abs(value) : null;
  return n != null ? `${n} %` : "";
}

function absPoints(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? Math.abs(value) : null;
  return n != null ? `${n.toLocaleString("sv-SE")} punkter` : "";
}

function num(value: number | string | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString("sv-SE") : "";
}

// Fixed-decimal Swedish number (comma separator). Use for rates/multipliers
// that arrive with noisy precision — e.g. conversionRate 3.502 → "3,50".
function decimals(value: number | string | null | undefined, places: number): string {
  if (typeof value !== "number") return "";
  return value.toLocaleString("sv-SE", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

// Each builder returns a single short sentence. Keep them tight — these render
// in a small card under the label. Guard every interpolation: metrics can be
// null, and the copy must still read as a complete sentence.
const SIGNAL_COPY: Partial<
  Record<InsightType, { label: string; body: (m: Metrics) => string }>
> = {
  traffic_up_broadly: {
    label: "Trafiken växer",
    body: (m) => {
      const d = absPct(m.visitsDelta);
      return d
        ? `Besöken ökade ${d} mot förra perioden — fler hittar er.`
        : "Besöken ökade mot förra perioden — fler hittar er.";
    },
  },
  traffic_down_broadly: {
    label: "Trafiken minskar",
    body: (m) => {
      const d = absPct(m.visitsDelta);
      return d
        ? `Besöken föll ${d} mot förra perioden — färre når in.`
        : "Besöken föll mot förra perioden — färre når in.";
    },
  },
  traffic_drop_organic: {
    label: "Organisk trafik tappar",
    body: (m) => {
      const d = absPct(m.organicDelta);
      return d
        ? `Trafiken från Google sjönk ${d} — värt att se över rankingen.`
        : "Trafiken från Google sjönk — värt att se över rankingen.";
    },
  },
  traffic_drop_paid: {
    label: "Betald trafik tappar",
    body: (m) => {
      const d = absPct(m.paidDelta);
      return d
        ? `Annonstrafiken sjönk ${d} — kontrollera kampanjer och budget.`
        : "Annonstrafiken sjönk — kontrollera kampanjer och budget.";
    },
  },
  traffic_channel_concentrated: {
    label: "En kanal dominerar",
    body: (m) => {
      const ch = typeof m.topChannel === "string" ? m.topChannel : "en kanal";
      const share = num(m.topChannelShare);
      return share
        ? `${ch} står för ${share} % av trafiken — ett tapp där märks direkt.`
        : `${ch} står för merparten av trafiken — ett tapp där märks direkt.`;
    },
  },
  engagement_down: {
    label: "Engagemanget sjunker",
    body: (m) => {
      const p = absPoints(m.bounceRateDelta);
      return p
        ? `Avvisningen steg ${p} — fler lämnar utan att engagera sig.`
        : "Fler lämnar sidan utan att engagera sig.";
    },
  },
  engagement_up: {
    label: "Engagemanget ökar",
    body: (m) => {
      const p = absPoints(m.bounceRateDelta);
      return p
        ? `Avvisningen sjönk ${p} — fler stannar och engagerar sig.`
        : "Fler stannar kvar och engagerar sig.";
    },
  },
  contact_page_lost_visibility: {
    label: "Kontaktsidan tappade synlighet",
    body: () =>
      "Det är sidan där leads konverterar. En svagare ingång dit påverkar affären direkt.",
  },
  conversion_rate_improved: {
    label: "Fler tar nästa steg",
    body: (m) => {
      const r = decimals(m.conversionRate, 2);
      return r
        ? `Konverteringsgraden steg till ${r} % — besöken ger mer.`
        : "En högre andel av besöken blir kunder eller kontakt.";
    },
  },
  conversion_rate_declined: {
    label: "Färre tar nästa steg",
    body: (m) => {
      const r = decimals(m.conversionRate, 2);
      return r
        ? `Konverteringsgraden föll till ${r} % — fler besök, färre handlingar.`
        : "Fler besöker men färre agerar.";
    },
  },
  paid_cost_up_conversions_flat: {
    label: "Kostnaden upp, resultatet platt",
    body: (m) => {
      const d = absPct(m.spendDelta);
      return d
        ? `Annonskostnaden steg ${d} utan att konverteringarna följde med.`
        : "Annonskostnaden steg utan att konverteringarna följde med.";
    },
  },
  seo_positions_improving: {
    label: "Rankingen klättrar",
    body: () => "Ni syns högre upp i Google — det kan ge mer trafik framöver.",
  },
  seo_positions_declining: {
    label: "Rankingen tappar",
    body: () => "Ni syns längre ner i Google — se över de sidor som tappat.",
  },
  paid_roas_strong: {
    label: "Annonserna lönar sig",
    body: (m) => {
      const r = decimals(m.roas, 1);
      return r
        ? `Annonserna ger ${r}× tillbaka — det finns utrymme att skala.`
        : "Annonserna ger god avkastning — det finns utrymme att skala.";
    },
  },
};

// Insights that make sense as a glanceable signal on this slide. We don't want
// meta-signals (e.g. ai_visibility_untracked, data_missing) padding the cards.
const SIGNAL_SURFACE = "slide_insight";

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};

/**
 * Build the signal cards for the strategic-insight slide from classified
 * insights. Returns up to `limit` cards, highest-severity first; if fewer
 * qualifying insights exist, returns fewer (never pads with filler).
 */
export function deriveSignalCards(insights: Insight[], limit = 3): SignalCard[] {
  const seen = new Set<InsightType>();
  return insights
    .filter(
      (i) => i.surface.includes(SIGNAL_SURFACE) && SIGNAL_COPY[i.type] != null,
    )
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .filter((i) => {
      // One card per insight type — avoid two cards saying the same thing.
      if (seen.has(i.type)) return false;
      seen.add(i.type);
      return true;
    })
    .slice(0, limit)
    .map((i) => {
      const copy = SIGNAL_COPY[i.type]!;
      return {
        label: copy.label,
        body: copy.body(i.metrics),
        positive: i.severity === "positive",
      };
    });
}
