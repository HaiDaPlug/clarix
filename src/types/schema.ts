import { z } from "zod";

// ─── Source availability ───────────────────────────────────────────────────

export const DataSourceSchema = z.enum([
  "ga4",
  "gsc",
  "google_ads",
  "manual",
  "linkedin",
]);
export type DataSource = z.infer<typeof DataSourceSchema>;

export const ReportTypeSchema = z.enum([
  "seo",
  "paid",
  "traffic",
  "full",
  "custom",
]);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const CadenceSchema = z.enum(["weekly", "monthly", "quarterly"]);
export type Cadence = z.infer<typeof CadenceSchema>;

// ─── Shared primitives ─────────────────────────────────────────────────────

export const MetricSchema = z.object({
  value: z.number(),
  previousValue: z.number().optional(),
  unit: z
    .enum(["number", "percent", "currency", "seconds", "string"])
    .default("number"),
  label: z.string(),
  trend: z.enum(["up", "down", "flat"]).optional(),
  trendGood: z.boolean().optional(), // up = good? not always
});
export type Metric = z.infer<typeof MetricSchema>;

export const TimeSeriesPointSchema = z.object({
  date: z.string(), // ISO date string
  value: z.number(),
  secondaryValue: z.number().optional(),
});
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export const IssueSchema = z.object({
  id: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  pagesAffected: z.number().optional(),
  impact: z.enum(["high", "medium", "low"]),
});
export type Issue = z.infer<typeof IssueSchema>;

export const RecommendationSchema = z.object({
  id: z.string(),
  priority: z.number(), // 1 = highest
  category: z.string(),
  action: z.string(),
  rationale: z.string(),
  effort: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  source: DataSourceSchema.optional(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

// ─── Executive summary ────────────────────────────────────────────────────

export const ExecutiveSummarySchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  paragraphs: z.array(z.string()).max(3),
  highlights: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      sentiment: z.enum(["positive", "negative", "neutral"]),
    })
  ),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type ExecutiveSummary = z.infer<typeof ExecutiveSummarySchema>;

// ─── KPI snapshot ─────────────────────────────────────────────────────────

export const KpiSnapshotSchema = z.object({
  metrics: z.array(MetricSchema).max(6),
  period: z.string(),
  comparisonPeriod: z.string().optional(),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type KpiSnapshot = z.infer<typeof KpiSnapshotSchema>;

// ─── Traffic ──────────────────────────────────────────────────────────────

export const TrafficOverviewSchema = z.object({
  totalSessions: MetricSchema,
  organicSessions: MetricSchema.optional(),
  directSessions: MetricSchema.optional(),
  referralSessions: MetricSchema.optional(),
  paidSessions: MetricSchema.optional(),
  bounceRate: MetricSchema.optional(),
  avgSessionDuration: MetricSchema.optional(),
  timeSeries: z.array(TimeSeriesPointSchema),
  channelBreakdown: z
    .array(
      z.object({
        channel: z.string(),
        sessions: z.number(),
        share: z.number(),
      })
    )
    .optional(),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type TrafficOverview = z.infer<typeof TrafficOverviewSchema>;

// ─── SEO ──────────────────────────────────────────────────────────────────

export const SeoOverviewSchema = z.object({
  totalClicks: MetricSchema,
  totalImpressions: MetricSchema,
  avgPosition: MetricSchema,
  avgCtr: MetricSchema,
  timeSeries: z.array(TimeSeriesPointSchema),
  topQueries: z
    .array(
      z.object({
        query: z.string(),
        clicks: z.number(),
        impressions: z.number(),
        position: z.number(),
        ctr: z.number(),
      })
    )
    .optional(),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type SeoOverview = z.infer<typeof SeoOverviewSchema>;

// ─── Top pages ────────────────────────────────────────────────────────────

export const TopPagesSchema = z.object({
  pages: z.array(
    z.object({
      url: z.string(),
      title: z.string().optional(),
      sessions: z.number().optional(),
      clicks: z.number().optional(),
      impressions: z.number().optional(),
      position: z.number().optional(),
      bounceRate: z.number().optional(),
      trend: z.enum(["up", "down", "flat"]).optional(),
    })
  ),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type TopPages = z.infer<typeof TopPagesSchema>;

// ─── Paid ─────────────────────────────────────────────────────────────────

export const PaidOverviewSchema = z.object({
  totalSpend: MetricSchema,
  totalClicks: MetricSchema,
  totalImpressions: MetricSchema,
  avgCpc: MetricSchema,
  avgCtr: MetricSchema,
  conversions: MetricSchema.optional(),
  costPerConversion: MetricSchema.optional(),
  roas: MetricSchema.optional(),
  timeSeries: z.array(TimeSeriesPointSchema),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type PaidOverview = z.infer<typeof PaidOverviewSchema>;

// ─── Conversions ──────────────────────────────────────────────────────────

export const ConversionSchema = z.object({
  totalConversions: MetricSchema,
  conversionRate: MetricSchema,
  topGoals: z
    .array(
      z.object({
        name: z.string(),
        completions: z.number(),
        rate: z.number().optional(),
      })
    )
    .optional(),
  timeSeries: z.array(TimeSeriesPointSchema).optional(),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type Conversion = z.infer<typeof ConversionSchema>;

// ─── Site health ──────────────────────────────────────────────────────────

export const SiteHealthSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(IssueSchema),
  aiSummary: z
    .object({
      whatHappened: z.string().optional(),
      whyItMatters: z.string().optional(),
      nextStep: z.string().optional(),
    })
    .optional(),
});
export type SiteHealth = z.infer<typeof SiteHealthSchema>;

// ─── Report metadata ──────────────────────────────────────────────────────

export const ReportMetaSchema = z.object({
  id: z.string(),
  clientName: z.string(),
  clientDomain: z.string().optional(),
  clientLogoUrl: z.string().optional(),
  agencyName: z.string(),
  agencyLogoUrl: z.string().optional(),
  reportType: ReportTypeSchema,
  cadence: CadenceSchema,
  period: z.object({
    label: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  availableSources: z.array(DataSourceSchema),
  generatedAt: z.string(),
});
export type ReportMeta = z.infer<typeof ReportMetaSchema>;

// ─── Canonical report schema ───────────────────────────────────────────────

export const ReportDataSchema = z.object({
  meta: ReportMetaSchema,
  executiveSummary: ExecutiveSummarySchema.optional(),
  kpiSnapshot: KpiSnapshotSchema.optional(),
  trafficOverview: TrafficOverviewSchema.optional(),
  seoOverview: SeoOverviewSchema.optional(),
  topPages: TopPagesSchema.optional(),
  paidOverview: PaidOverviewSchema.optional(),
  conversions: ConversionSchema.optional(),
  siteHealth: SiteHealthSchema.optional(),
  issues: z.array(IssueSchema).optional(),
  recommendations: z.array(RecommendationSchema).optional(),
  sourceConfidence: z
    .record(
      z.string(),
      z.object({
        connected: z.boolean(),
        lastSync: z.string().optional(),
        coverage: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
});
export type ReportData = z.infer<typeof ReportDataSchema>;
