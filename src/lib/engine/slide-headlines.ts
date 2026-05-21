import type { InsightType } from "./derive-insights";

// Deterministic headline lookup keyed on the dominant insight type.
// Priority: critical > warning > positive > neutral.
// The report headline on SlideHero should always reflect what actually happened.

const HEADLINES: Partial<Record<InsightType, string>> = {
  traffic_up_broadly:             "Din digitala synlighet går åt rätt håll",
  traffic_down_broadly:           "Trafiken tappade mark den här perioden",
  traffic_drop_organic:           "Den organiska trafiken behöver uppmärksamhet",
  traffic_drop_paid:              "Den betalda trafiken tappade mark",
  traffic_channel_concentrated:   "En kanal dominerar trafiken just nu",
  engagement_down:                "Fler besökare — men kortare besök",
  engagement_up:                  "Besökarna stannar längre än förut",
  contact_page_lost_visibility:   "Kontaktsidan tappade synlighet",
  paid_roas_strong:               "Annonserna levererar stark avkastning",
  paid_cost_up_conversions_flat:  "Annonskostnaden steg utan att konverteringarna följde med",
  seo_positions_improving:        "Sökpositionen förbättras",
  seo_positions_declining:        "Sökpositionen tappade mark",
  conversion_rate_improved:       "Fler besökare konverterar nu",
  conversion_rate_declined:       "Konverteringsgraden gick ned",
  data_missing_tracking_issue:    "Vi behöver mer data för att ge en fullständig bild",
};

const FALLBACK = "Här är din digitala rapport";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};

export function deriveSlideHeadline(
  insights: { type: InsightType; severity: string }[],
): string {
  if (insights.length === 0) return FALLBACK;

  const sorted = [...insights].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  for (const insight of sorted) {
    const headline = HEADLINES[insight.type];
    if (headline) return headline;
  }

  return FALLBACK;
}
