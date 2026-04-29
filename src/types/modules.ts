import { DataSource, ReportType, Cadence, ReportData } from "./schema";
import { InsightContract } from "./insight";

// ─── AI summary contract stub (legacy — use InsightContract going forward) ──

export interface AiSummaryContract {
  whatHappened?: string;
  whyItMatters?: string;
  nextStep?: string;
  confidence?: "high" | "medium" | "low";
}

// ─── Module category ──────────────────────────────────────────────────────

export type ModuleCategory =
  | "structure"
  | "summary"
  | "snapshot"
  | "acquisition"
  | "visibility"
  | "performance"
  | "paid"
  | "conversion"
  | "health"
  | "actions";

// ─── Module render variant ────────────────────────────────────────────────

export type RenderVariant = "full" | "simplified" | "minimal";

// ─── Eligibility result ───────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  variant: RenderVariant;
  missingRequired: string[];
  missingOptional: string[];
  reason?: string;
}

// ─── Data hierarchy — where a module belongs in the narrative ─────────────

export type DataHierarchy = "core" | "contextual" | "appendix";

// ─── Business criticality — how bad it is if this module is missing ────────

export type BusinessCriticality = "critical" | "important" | "optional";

// ─── Module definition ────────────────────────────────────────────────────

export interface ModuleDefinition {
  id: string;
  name: string;
  category: ModuleCategory;
  description: string;
  supportedReportTypes: ReportType[];
  supportedCadences: Cadence[];
  requiredSources: DataSource[];
  optionalSources: DataSource[];
  requiredDataFields: string[]; // dot-notation paths into ReportData
  optionalDataFields: string[]; // dot-notation paths into ReportData
  alwaysInclude: boolean;
  priority: number; // lower = higher priority
  supportsFallback: boolean;
  fallbackDescription?: string;
  // Where this module belongs in the report narrative
  dataHierarchy: DataHierarchy;
  // How bad it is for the story if this module can't render
  businessCriticality: BusinessCriticality;
  // What decision-making question this slide answers
  businessQuestion: string;
  // What action or decision this slide enables
  decisionUse: string;
  // Legacy AI contract — kept for compatibility
  aiSummaryContract: AiSummaryContract;
  // Future insight shape — observation / implication / recommendedAction
  insightContract?: Partial<InsightContract>;
  // Component renderer — resolved at runtime
  component: React.ComponentType<ModuleProps>;
}

// ─── Module props ─────────────────────────────────────────────────────────

export interface ModuleProps {
  data: ReportData;
  variant: RenderVariant;
  isActive?: boolean;
  slideIndex?: number;
  totalSlides?: number;
}

// ─── Assembled deck ───────────────────────────────────────────────────────

export interface AssembledSlide {
  moduleId: string;
  module: ModuleDefinition;
  eligibility: EligibilityResult;
  order: number;
  section: DeckSection;
}

export type DeckSection =
  | "cover"
  | "summary"
  | "snapshot"
  | "acquisition"
  | "performance"
  | "issues"
  | "actions"
  | "appendix";

export interface MissingModule {
  moduleId: string;
  moduleName: string;
  businessCriticality: BusinessCriticality;
  missingRequired: string[];
  missingOptional: string[];
  reason: string;
  recommendedFix?: string;
}

export interface AssembledDeck {
  slides: AssembledSlide[];
  missingModules: MissingModule[];
  reportData: ReportData;
  generatedAt: string;
}
