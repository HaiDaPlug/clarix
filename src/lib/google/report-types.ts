import type { ReportData } from "@/types/schema";

export type GoogleReportLocale = "sv" | "en";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type Ga4RunReportResponse = {
  dimensionHeaders?: Array<{ name?: string }>;
  metricHeaders?: Array<{ name?: string; type?: string }>;
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
  metadata?: {
    samplingMetadatas?: Array<{
      samplesReadCount?: string;
      samplingSpaceSize?: string;
    }>;
  };
};

export type GscSearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type GscSearchAnalyticsResponse = {
  rows?: GscSearchAnalyticsRow[];
};

export type Ga4ResponseSet = {
  summary: Ga4RunReportResponse;
  channels: Ga4RunReportResponse;
  timeSeries: Ga4RunReportResponse;
  topPages: Ga4RunReportResponse;
};

export type GscResponseSet = {
  summary: GscSearchAnalyticsResponse;
  timeSeries: GscSearchAnalyticsResponse;
  topQueries: GscSearchAnalyticsResponse;
  topPages: GscSearchAnalyticsResponse;
};

export type PartialReportData = Partial<
  Pick<
    ReportData,
    | "trafficOverview"
    | "seoOverview"
    | "conversions"
    | "kpiSnapshot"
    | "topPages"
    | "sourceConfidence"
  >
>;
