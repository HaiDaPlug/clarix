import { ReportData } from "@/types/schema";

/**
 * Scenario 2: GA4 + GSC + Google Ads
 * Full deck - traffic, SEO, and paid modules all included.
 */
export const scenario2: ReportData = {
  meta: {
    id: "rpt_scenario_2",
    clientName: "Lindqvist Juridik AB",
    clientDomain: "lindqvistjuridik.se",
    agencyName: "Digital Effekt",
    reportType: "full",
    cadence: "monthly",
    period: {
      label: "Mars 2026",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    },
    availableSources: ["ga4", "gsc", "google_ads"],
    generatedAt: "2026-04-01T09:00:00Z",
  },

  executiveSummary: {
    headline: "En bra månad. Annonserna drog och SEO höll.",
    subheadline:
      "Ni fick 24 % fler leads från Google Ads och kostnade mindre per lead än månaden innan. Organiken tappade lite men inget att oroa sig för.",
    paragraphs: [
      "Mars visade en tydlig skillnad mellan kanalerna: betald sökning överpresterade medan organisk synlighet planade ut. Google Ads drev 340 konverteringar till en kostnad per lead 12 % under mål.",
      "Organisk klickvolym minskade något på grund av lägre säsongsefterfrågan. Positionerna är stabila och inga strukturella SEO-problem identifierades.",
    ],
    highlights: [
      { label: "Betalda konverteringar", value: "+24%", sentiment: "positive" },
      { label: "Kostnad per lead", value: "-12%", sentiment: "positive" },
      { label: "Organiska sessioner", value: "-3%", sentiment: "negative" },
    ],
    aiSummary: {
      whatHappened:
        "Betald sökning drev 340 konverteringar till 12 % lägre CPL än mål. Organisk trafik minskade 3 % på grund av säsongseffekt.",
      whyItMatters:
        "Effektivitetslyftet i paid är väsentligt och bör påverka budgetfördelningen inför Q2.",
      nextStep:
        "Skala de bäst presterande paid-kampanjerna med 20 % och gör en innehållsrevision av de fem viktigaste organiska sidorna.",
    },
  },

  kpiSnapshot: {
    period: "Mars 2026",
    comparisonPeriod: "Februari 2026",
    metrics: [
      { label: "Totala sessioner", value: 31_420, previousValue: 29_840, unit: "number", trend: "up", trendGood: true },
      { label: "Betalda sessioner", value: 11_200, previousValue: 9_100, unit: "number", trend: "up", trendGood: true },
      { label: "Totala konverteringar", value: 340, previousValue: 274, unit: "number", trend: "up", trendGood: true },
      { label: "Annonskostnad", value: 48_500, previousValue: 51_200, unit: "currency", trend: "down", trendGood: true },
      { label: "Kostnad per lead", value: 142, previousValue: 162, unit: "currency", trend: "down", trendGood: true },
      { label: "Genomsn. position (SEO)", value: 10.8, previousValue: 10.4, unit: "number", trend: "down", trendGood: false },
    ],
  },

  trafficOverview: {
    totalSessions: { label: "Totala sessioner", value: 31_420, previousValue: 29_840, unit: "number", trend: "up", trendGood: true },
    organicSessions: { label: "Organisk trafik", value: 14_800, previousValue: 15_260, unit: "number", trend: "down", trendGood: false },
    directSessions: { label: "Direkt", value: 5_420, previousValue: 5_180, unit: "number", trend: "up", trendGood: true },
    paidSessions: { label: "Betald trafik", value: 11_200, previousValue: 9_400, unit: "number", trend: "up", trendGood: true },
    bounceRate: { label: "Avvisningsfrekvens", value: 44.8, previousValue: 46.1, unit: "percent", trend: "down", trendGood: true },
    avgSessionDuration: { label: "Genomsn. sessionslängd", value: 138, previousValue: 132, unit: "seconds", trend: "up", trendGood: true },
    timeSeries: [
      { date: "2026-03-01", value: 820, secondaryValue: 280 },
      { date: "2026-03-03", value: 1040, secondaryValue: 380 },
      { date: "2026-03-05", value: 980, secondaryValue: 360 },
      { date: "2026-03-07", value: 1180, secondaryValue: 440 },
      { date: "2026-03-10", value: 1060, secondaryValue: 410 },
      { date: "2026-03-12", value: 1340, secondaryValue: 520 },
      { date: "2026-03-14", value: 1280, secondaryValue: 490 },
      { date: "2026-03-17", value: 1020, secondaryValue: 400 },
      { date: "2026-03-19", value: 1140, secondaryValue: 440 },
      { date: "2026-03-21", value: 1360, secondaryValue: 530 },
      { date: "2026-03-24", value: 1300, secondaryValue: 510 },
      { date: "2026-03-26", value: 920, secondaryValue: 360 },
      { date: "2026-03-28", value: 1040, secondaryValue: 400 },
      { date: "2026-03-31", value: 1080, secondaryValue: 430 },
    ],
    channelBreakdown: [
      { channel: "Organisk sökning", sessions: 14_800, share: 47.1 },
      { channel: "Betald sökning", sessions: 11_200, share: 35.6 },
      { channel: "Direkt", sessions: 5_420, share: 17.3 },
    ],
  },

  seoOverview: {
    totalClicks: { label: "Totala klick", value: 7_820, previousValue: 8_140, unit: "number", trend: "down", trendGood: false },
    totalImpressions: { label: "Totala visningar", value: 241_000, previousValue: 238_000, unit: "number", trend: "up", trendGood: true },
    avgPosition: { label: "Genomsn. position", value: 10.8, previousValue: 10.4, unit: "number", trend: "down", trendGood: false },
    avgCtr: { label: "Genomsn. CTR", value: 3.2, previousValue: 3.4, unit: "percent", trend: "down", trendGood: false },
    timeSeries: [
      { date: "2026-03-01", value: 210, secondaryValue: 7200 },
      { date: "2026-03-03", value: 290, secondaryValue: 8800 },
      { date: "2026-03-05", value: 270, secondaryValue: 8200 },
      { date: "2026-03-07", value: 320, secondaryValue: 9600 },
      { date: "2026-03-10", value: 300, secondaryValue: 9000 },
      { date: "2026-03-12", value: 380, secondaryValue: 11200 },
      { date: "2026-03-14", value: 350, secondaryValue: 10400 },
      { date: "2026-03-17", value: 310, secondaryValue: 9200 },
      { date: "2026-03-19", value: 330, secondaryValue: 9800 },
      { date: "2026-03-21", value: 400, secondaryValue: 11800 },
      { date: "2026-03-24", value: 380, secondaryValue: 11200 },
      { date: "2026-03-26", value: 250, secondaryValue: 7600 },
      { date: "2026-03-28", value: 280, secondaryValue: 8400 },
      { date: "2026-03-31", value: 300, secondaryValue: 9000 },
    ],
  },

  paidOverview: {
    totalSpend: { label: "Total kostnad", value: 48_500, previousValue: 51_200, unit: "currency", trend: "down", trendGood: true },
    totalClicks: { label: "Klick", value: 11_200, previousValue: 9_400, unit: "number", trend: "up", trendGood: true },
    totalImpressions: { label: "Visningar", value: 184_000, previousValue: 161_000, unit: "number", trend: "up", trendGood: true },
    avgCpc: { label: "Genomsn. CPC", value: 4.33, previousValue: 5.45, unit: "currency", trend: "down", trendGood: true },
    avgCtr: { label: "CTR", value: 6.1, previousValue: 5.8, unit: "percent", trend: "up", trendGood: true },
    conversions: { label: "Konverteringar", value: 340, previousValue: 274, unit: "number", trend: "up", trendGood: true },
    costPerConversion: { label: "Kostnad/lead", value: 142, previousValue: 162, unit: "currency", trend: "down", trendGood: true },
    roas: { label: "ROAS", value: 4.2, previousValue: 3.8, unit: "number", trend: "up", trendGood: true },
    timeSeries: [
      { date: "2026-03-01", value: 1400, secondaryValue: 9 },
      { date: "2026-03-03", value: 1820, secondaryValue: 12 },
      { date: "2026-03-05", value: 1680, secondaryValue: 11 },
      { date: "2026-03-07", value: 2100, secondaryValue: 14 },
      { date: "2026-03-10", value: 1900, secondaryValue: 13 },
      { date: "2026-03-12", value: 2400, secondaryValue: 16 },
      { date: "2026-03-14", value: 2200, secondaryValue: 15 },
      { date: "2026-03-17", value: 1800, secondaryValue: 12 },
      { date: "2026-03-19", value: 2000, secondaryValue: 13 },
      { date: "2026-03-21", value: 2500, secondaryValue: 17 },
      { date: "2026-03-24", value: 2300, secondaryValue: 15 },
      { date: "2026-03-26", value: 1600, secondaryValue: 10 },
      { date: "2026-03-28", value: 1840, secondaryValue: 12 },
      { date: "2026-03-31", value: 1960, secondaryValue: 13 },
    ],
  },

  conversions: {
    totalConversions: { label: "Totala konverteringar", value: 340, previousValue: 274, unit: "number", trend: "up", trendGood: true },
    conversionRate: { label: "Konverteringsgrad", value: 3.0, previousValue: 2.9, unit: "percent", trend: "up", trendGood: true },
    topGoals: [
      { name: "Kontaktformulär skickat", completions: 188, rate: 1.7 },
      { name: "Telefonnummer klickat", completions: 102, rate: 0.9 },
      { name: "Rådgivning bokad", completions: 50, rate: 0.4 },
    ],
  },

  issues: [
    {
      id: "iss_001",
      severity: "warning",
      category: "Betald annonsering",
      title: "Två annonsgrupper underpresterar",
      description: "Två annonsgrupper i kampanjen Företagsjuridik har CTR under 2 %, vilket drar ned kontots kvalitetssignal.",
      impact: "medium",
    },
    {
      id: "iss_002",
      severity: "info",
      category: "SEO",
      title: "Mindre positionstapp på viktiga termer",
      description: "Genomsnittlig position försämrades med 0,4 punkter. Följ utvecklingen i två veckor innan större åtgärder tas.",
      impact: "low",
    },
  ],

  recommendations: [
    {
      id: "rec_001",
      priority: 1,
      category: "Betald annonsering",
      action: "Pausa eller strukturera om de två svagaste annonsgrupperna",
      rationale: "Låg CTR sänker kvalitetssignalerna och driver upp CPC i kontot. Paus eller ny annonstext bör förbättra effektiviteten.",
      effort: "low",
      impact: "high",
      source: "google_ads",
    },
    {
      id: "rec_002",
      priority: 2,
      category: "Betald annonsering",
      action: "Öka budgeten med 20 % i de tre bäst presterande kampanjerna",
      rationale: "ROAS på 4,2x och CPL 12 % under mål visar att det finns utrymme att skala lönsamt.",
      effort: "low",
      impact: "high",
      source: "google_ads",
    },
    {
      id: "rec_003",
      priority: 3,
      category: "SEO",
      action: "Följ organiska positioner i två veckor och granska därefter tappande sidor",
      rationale: "Tappet är begränsat och kan vara säsongsdrivet. Avvakta kort, men sätt en tydlig uppföljningspunkt.",
      effort: "low",
      impact: "medium",
      source: "gsc",
    },
  ],
};
