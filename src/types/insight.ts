export type InsightConfidence = "high" | "medium" | "low";

export interface MissingContextItem {
  field: string;
  reason: string;
  impact: string;
  recommendedFix?: string;
}

export interface InsightContract {
  observation: string;
  implication: string;
  recommendedAction: string;
  confidence: InsightConfidence;
  supportingMetrics: string[];
  missingContext?: MissingContextItem[];
}
