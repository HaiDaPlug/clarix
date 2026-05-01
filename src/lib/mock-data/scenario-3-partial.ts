import { ReportData } from "@/types/schema";

/**
 * Scenario 3: Manual / partial fallback data
 * Partial completeness - the shell must not break.
 * Some optional fields are missing. No timeSeries for some modules.
 */
export const scenario3: ReportData = {
  meta: {
    id: "rpt_scenario_3",
    clientName: "Eklund Fastigheter",
    clientDomain: "ekfastigheter.se",
    agencyName: "Digital Effekt",
    reportType: "full",
    cadence: "monthly",
    period: {
      label: "Mars 2026",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    },
    availableSources: ["manual", "gsc"],
    generatedAt: "2026-04-01T10:00:00Z",
  },

  executiveSummary: {
    headline: "Bilden är inte komplett — men riktningen är rätt.",
    subheadline:
      "Söktrafiken pekar uppåt. Koppla GA4 så får du hela storyn.",
    paragraphs: [
      "Eklund Fastigheters synlighetsdata från Google Search Console visar positiv utveckling i mars. Full trafikdata blir tillgänglig när GA4 är anslutet.",
    ],
    highlights: [
      { label: "GSC-klick", value: "+11%", sentiment: "positive" },
      { label: "Datakällor", value: "Partiellt", sentiment: "neutral" },
    ],
  },

  kpiSnapshot: {
    period: "Mars 2026",
    metrics: [
      { label: "GSC-klick", value: 3_420, previousValue: 3_080, unit: "number", trend: "up", trendGood: true },
      { label: "GSC-visningar", value: 94_200, previousValue: 88_400, unit: "number", trend: "up", trendGood: true },
      { label: "Genomsn. position", value: 14.2, previousValue: 16.1, unit: "number", trend: "up", trendGood: true },
    ],
  },

  // No GA4 - trafficOverview is absent (will suppress traffic module)

  seoOverview: {
    totalClicks: { label: "Totala klick", value: 3_420, previousValue: 3_080, unit: "number", trend: "up", trendGood: true },
    totalImpressions: { label: "Totala visningar", value: 94_200, previousValue: 88_400, unit: "number", trend: "up", trendGood: true },
    avgPosition: { label: "Genomsn. position", value: 14.2, previousValue: 16.1, unit: "number", trend: "up", trendGood: true },
    avgCtr: { label: "Genomsn. CTR", value: 3.6, previousValue: 3.5, unit: "percent", trend: "up", trendGood: true },
    timeSeries: [
      { date: "2026-03-01", value: 90 },
      { date: "2026-03-07", value: 120 },
      { date: "2026-03-14", value: 110 },
      { date: "2026-03-21", value: 140 },
      { date: "2026-03-28", value: 130 },
    ],
    // topQueries absent - simplified render should activate
  },

  // No paid - paidOverview absent

  issues: [
    {
      id: "iss_001",
      severity: "info",
      category: "Data",
      title: "GA4 är inte anslutet",
      description: "Trafikdata saknas. Anslut GA4 för att låsa upp full trafik- och konverteringsrapportering.",
      impact: "medium",
    },
  ],

  recommendations: [
    {
      id: "rec_001",
      priority: 1,
      category: "Uppsättning",
      action: "Anslut GA4 för full trafik- och konverteringsrapportering",
      rationale: "Just nu finns endast GSC och manuell data. GA4-anslutningen tar normalt under tio minuter.",
      effort: "low",
      impact: "high",
    },
    {
      id: "rec_002",
      priority: 2,
      category: "SEO",
      action: "Fortsätt optimera för lokala sökfrågor",
      rationale: "Positionsförbättringarna i mars tyder på att lokalt SEO-arbete ger effekt. Behåll tempot.",
      effort: "medium",
      impact: "medium",
      source: "gsc",
    },
  ],

  sourceConfidence: {
    ga4: { connected: false },
    gsc: { connected: true, lastSync: "2026-04-01T06:00:00Z", coverage: 1.0 },
    google_ads: { connected: false },
    manual: { connected: true, coverage: 0.4 },
  },
};
