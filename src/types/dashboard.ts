import { DataSource, ReportData } from "@/types/schema";

export type DashboardItemType = "hero" | "kpi" | "chart" | "section";

export type DashboardItemId =
  | "ai-summary-hero"
  | "traffic-kpi"
  | "organic-reach-kpi"
  | "search-clicks-kpi"
  | "engagement-kpi"
  | "conversions-kpi"
  | "paid-efficiency-kpi"
  | "sessions-over-time"
  | "channel-breakdown"
  | "search-visibility"
  | "paid-performance";

export type DashboardRenderVariant = "full" | "simplified" | "minimal";

export interface DashboardFieldAlternative {
  fields: string[];
  minPresent: number;
  description: string;
}

export interface DashboardEligibilityResult {
  eligible: boolean;
  variant: DashboardRenderVariant;
  missingRequired: string[];
  missingOptional: string[];
  reason?: string;
}

export interface DashboardDefinition {
  id: DashboardItemId;
  name: string;
  type: DashboardItemType;
  requiredSources: DataSource[];
  optionalSources: DataSource[];
  requiredDataFields: string[];
  alternativeRequiredDataFields?: DashboardFieldAlternative;
  optionalDataFields: string[];
  priority: number;
  businessQuestion: string;
  decisionUse: string;
  notes: string;
  metricPath?: string;
  secondaryMetricPaths?: string[];
}

export interface AssembledDashboardItem {
  itemId: DashboardItemId;
  definition: DashboardDefinition;
  eligibility: DashboardEligibilityResult;
  order: number;
}

export interface DashboardNudge {
  source: Extract<DataSource, "ga4" | "gsc" | "google_ads">;
  message: string;
}

export interface AssembledDashboard {
  items: AssembledDashboardItem[];
  nudge?: DashboardNudge;
  reportData: ReportData;
  generatedAt: string;
}
