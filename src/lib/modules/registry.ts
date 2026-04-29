import { lazy } from "react";
import { ModuleDefinition } from "@/types/modules";

// Lazy-load slide components to keep the module registry tree-shakeable
const CoverSlide = lazy(() => import("@/components/slides/CoverSlide"));
const ExecutiveSummarySlide = lazy(() => import("@/components/slides/ExecutiveSummarySlide"));
const KpiSnapshotSlide = lazy(() => import("@/components/slides/KpiSnapshotSlide"));
const TrafficOverviewSlide = lazy(() => import("@/components/slides/TrafficOverviewSlide"));
const SeoOverviewSlide = lazy(() => import("@/components/slides/SeoOverviewSlide"));
const TopPagesSlide = lazy(() => import("@/components/slides/TopPagesSlide"));
const PaidOverviewSlide = lazy(() => import("@/components/slides/PaidOverviewSlide"));
const ConversionSlide = lazy(() => import("@/components/slides/ConversionSlide"));
const IssuesSlide = lazy(() => import("@/components/slides/IssuesSlide"));
const RecommendationsSlide = lazy(() => import("@/components/slides/RecommendationsSlide"));

export const moduleRegistry: ModuleDefinition[] = [
  // ─── Cover ──────────────────────────────────────────────────────────
  {
    id: "cover",
    name: "Cover",
    category: "structure",
    description: "Report cover slide with client name, period, and branding.",
    supportedReportTypes: ["seo", "paid", "traffic", "full", "custom"],
    supportedCadences: ["weekly", "monthly", "quarterly"],
    requiredSources: [],
    optionalSources: [],
    requiredDataFields: ["meta"],
    optionalDataFields: ["meta.clientLogoUrl"],
    alwaysInclude: true,
    priority: 0,
    supportsFallback: false,
    dataHierarchy: "core",
    businessCriticality: "critical",
    businessQuestion: "Who is this report for and what period does it cover?",
    decisionUse: "Sets context and trust before the client reads any number.",
    aiSummaryContract: {},
    component: CoverSlide,
  },

  // ─── Executive Summary ───────────────────────────────────────────────
  {
    id: "executive-summary",
    name: "Executive Summary",
    category: "summary",
    description: "High-level narrative summary of the reporting period.",
    supportedReportTypes: ["seo", "paid", "traffic", "full", "custom"],
    supportedCadences: ["weekly", "monthly", "quarterly"],
    requiredSources: [],
    optionalSources: ["ga4", "gsc", "google_ads"],
    requiredDataFields: ["executiveSummary"],
    optionalDataFields: ["executiveSummary.aiSummary"],
    alwaysInclude: true,
    priority: 1,
    supportsFallback: true,
    fallbackDescription: "Simplified summary without AI narrative.",
    dataHierarchy: "core",
    businessCriticality: "critical",
    businessQuestion: "What is the one-sentence verdict on this period?",
    decisionUse: "Lets the client decide whether to read further or act immediately.",
    aiSummaryContract: {
      whatHappened: undefined,
      whyItMatters: undefined,
      nextStep: undefined,
    },
    component: ExecutiveSummarySlide,
  },

  // ─── KPI Snapshot ────────────────────────────────────────────────────
  {
    id: "kpi-snapshot",
    name: "KPI Snapshot",
    category: "snapshot",
    description: "Key performance indicators with period-over-period comparison.",
    supportedReportTypes: ["seo", "paid", "traffic", "full", "custom"],
    supportedCadences: ["weekly", "monthly", "quarterly"],
    requiredSources: [],
    optionalSources: ["ga4", "gsc", "google_ads"],
    requiredDataFields: ["kpiSnapshot"],
    optionalDataFields: ["kpiSnapshot.comparisonPeriod"],
    alwaysInclude: false,
    priority: 2,
    supportsFallback: true,
    dataHierarchy: "core",
    businessCriticality: "critical",
    businessQuestion: "Are we growing — and are the most important numbers moving in the right direction?",
    decisionUse: "Gives the client a pulse check before diving into channel detail.",
    aiSummaryContract: {},
    component: KpiSnapshotSlide,
  },

  // ─── Traffic Overview ────────────────────────────────────────────────
  {
    id: "traffic-overview",
    name: "Traffic Overview",
    category: "acquisition",
    description: "Session trends, channel breakdown, and engagement metrics from GA4.",
    supportedReportTypes: ["traffic", "full", "custom"],
    supportedCadences: ["weekly", "monthly", "quarterly"],
    requiredSources: ["ga4"],
    optionalSources: [],
    requiredDataFields: ["trafficOverview", "trafficOverview.totalSessions"],
    optionalDataFields: [
      "trafficOverview.channelBreakdown",
      "trafficOverview.bounceRate",
      "trafficOverview.avgSessionDuration",
    ],
    alwaysInclude: false,
    priority: 3,
    supportsFallback: true,
    dataHierarchy: "core",
    businessCriticality: "critical",
    businessQuestion: "Did the site attract more or fewer visitors — and where did they come from?",
    decisionUse: "Helps decide whether to invest more in acquisition or optimise existing channels.",
    aiSummaryContract: {},
    component: TrafficOverviewSlide,
  },

  // ─── SEO Overview ────────────────────────────────────────────────────
  {
    id: "seo-overview",
    name: "SEO Overview",
    category: "visibility",
    description: "Clicks, impressions, CTR, and average position from Google Search Console.",
    supportedReportTypes: ["seo", "full", "custom"],
    supportedCadences: ["weekly", "monthly", "quarterly"],
    requiredSources: ["gsc"],
    optionalSources: [],
    requiredDataFields: ["seoOverview", "seoOverview.totalClicks"],
    optionalDataFields: ["seoOverview.topQueries"],
    alwaysInclude: false,
    priority: 4,
    supportsFallback: true,
    dataHierarchy: "core",
    businessCriticality: "important",
    businessQuestion: "Is the site becoming more or less visible in search — and are people clicking?",
    decisionUse: "Drives decisions on content, meta descriptions, and keyword targeting.",
    aiSummaryContract: {},
    component: SeoOverviewSlide,
  },

  // ─── Top Pages ────────────────────────────────────────────────────────
  {
    id: "top-pages",
    name: "Top Pages",
    category: "performance",
    description: "Best-performing landing pages by traffic and visibility.",
    supportedReportTypes: ["seo", "traffic", "full", "custom"],
    supportedCadences: ["monthly", "quarterly"],
    requiredSources: [],
    optionalSources: ["ga4", "gsc"],
    requiredDataFields: ["topPages", "topPages.pages"],
    optionalDataFields: [],
    alwaysInclude: false,
    priority: 5,
    supportsFallback: false,
    dataHierarchy: "contextual",
    businessCriticality: "important",
    businessQuestion: "Which pages are driving results — and which need attention?",
    decisionUse: "Identifies where to focus content improvements or conversion optimisation.",
    aiSummaryContract: {},
    component: TopPagesSlide,
  },

  // ─── Paid Overview ────────────────────────────────────────────────────
  {
    id: "paid-overview",
    name: "Paid Overview",
    category: "paid",
    description: "Spend, clicks, CTR, and ROAS from Google Ads.",
    supportedReportTypes: ["paid", "full", "custom"],
    supportedCadences: ["weekly", "monthly", "quarterly"],
    requiredSources: ["google_ads"],
    optionalSources: [],
    requiredDataFields: ["paidOverview", "paidOverview.totalSpend"],
    optionalDataFields: ["paidOverview.roas", "paidOverview.conversions"],
    alwaysInclude: false,
    priority: 6,
    supportsFallback: true,
    dataHierarchy: "core",
    businessCriticality: "critical",
    businessQuestion: "Is the paid budget working — are we getting efficient returns on spend?",
    decisionUse: "Drives budget reallocation and bid strategy decisions.",
    aiSummaryContract: {},
    component: PaidOverviewSlide,
  },

  // ─── Conversion / Lead Efficiency ────────────────────────────────────
  {
    id: "conversion",
    name: "Conversion & Lead Efficiency",
    category: "conversion",
    description: "Conversion rates and goal completions.",
    supportedReportTypes: ["paid", "full", "custom"],
    supportedCadences: ["monthly", "quarterly"],
    requiredSources: [],
    optionalSources: ["ga4", "google_ads"],
    requiredDataFields: ["conversions"],
    optionalDataFields: ["conversions.topGoals", "conversions.timeSeries"],
    alwaysInclude: false,
    priority: 7,
    supportsFallback: true,
    dataHierarchy: "core",
    businessCriticality: "critical",
    businessQuestion: "Is traffic turning into leads or sales — and at what rate?",
    decisionUse: "The most direct signal of whether digital activity is creating business value.",
    aiSummaryContract: {},
    component: ConversionSlide,
  },

  // ─── Issues / Watchouts ───────────────────────────────────────────────
  {
    id: "issues",
    name: "Issues & Watchouts",
    category: "health",
    description: "Technical issues and performance watchouts requiring attention.",
    supportedReportTypes: ["seo", "traffic", "full", "custom"],
    supportedCadences: ["monthly", "quarterly"],
    requiredSources: [],
    optionalSources: ["ga4", "gsc"],
    requiredDataFields: ["issues"],
    optionalDataFields: ["siteHealth"],
    alwaysInclude: false,
    priority: 8,
    supportsFallback: true,
    dataHierarchy: "core",
    businessCriticality: "important",
    businessQuestion: "What is silently hurting performance that the client should know about?",
    decisionUse: "Surfaces problems before they become expensive — gives the client reason to act.",
    aiSummaryContract: {},
    component: IssuesSlide,
  },

  // ─── Recommendations ──────────────────────────────────────────────────
  {
    id: "recommendations",
    name: "Recommendations",
    category: "actions",
    description: "Prioritized actions and next steps.",
    supportedReportTypes: ["seo", "paid", "traffic", "full", "custom"],
    supportedCadences: ["weekly", "monthly", "quarterly"],
    requiredSources: [],
    optionalSources: [],
    requiredDataFields: ["recommendations"],
    optionalDataFields: [],
    alwaysInclude: false,
    priority: 9,
    supportsFallback: false,
    dataHierarchy: "core",
    businessCriticality: "critical",
    businessQuestion: "What should the client do next — and in what order?",
    decisionUse: "Closes the report with a clear mandate. The client leaves knowing what happens next.",
    aiSummaryContract: {},
    component: RecommendationsSlide,
  },
];

export function getModuleById(id: string): ModuleDefinition | undefined {
  return moduleRegistry.find((m) => m.id === id);
}
