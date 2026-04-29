import { ReportData } from "@/types/schema";
import { ModuleDefinition, EligibilityResult, RenderVariant } from "@/types/modules";
import { checkFields } from "@/lib/utils/field-check";

export function evaluateEligibility(
  module: ModuleDefinition,
  data: ReportData
): EligibilityResult {
  // Always-include modules are always eligible with full variant
  if (module.alwaysInclude) {
    return {
      eligible: true,
      variant: "full",
      missingRequired: [],
      missingOptional: [],
    };
  }

  // Check report type compatibility
  if (!module.supportedReportTypes.includes(data.meta.reportType)) {
    return {
      eligible: false,
      variant: "minimal",
      missingRequired: [],
      missingOptional: [],
      reason: `Report type '${data.meta.reportType}' not supported`,
    };
  }

  // Check cadence compatibility
  if (!module.supportedCadences.includes(data.meta.cadence)) {
    return {
      eligible: false,
      variant: "minimal",
      missingRequired: [],
      missingOptional: [],
      reason: `Cadence '${data.meta.cadence}' not supported`,
    };
  }

  // Check source availability
  const missingSources = module.requiredSources.filter(
    (s) => !data.meta.availableSources.includes(s)
  );
  if (missingSources.length > 0) {
    return {
      eligible: false,
      variant: "minimal",
      missingRequired: missingSources,
      missingOptional: [],
      reason: `Missing required sources: ${missingSources.join(", ")}`,
    };
  }

  // Check required data fields
  const { missing: missingRequired } = checkFields(data, module.requiredDataFields);
  if (missingRequired.length > 0) {
    if (!module.supportsFallback) {
      return {
        eligible: false,
        variant: "minimal",
        missingRequired,
        missingOptional: [],
        reason: `Missing required data fields: ${missingRequired.join(", ")}`,
      };
    }
  }

  // Check optional data fields for variant selection
  const { missing: missingOptional } = checkFields(data, module.optionalDataFields);

  let variant: RenderVariant = "full";
  if (missingRequired.length > 0 && module.supportsFallback) {
    variant = "simplified";
  } else if (missingOptional.length > module.optionalDataFields.length / 2) {
    variant = "simplified";
  }

  return {
    eligible: true,
    variant,
    missingRequired,
    missingOptional,
  };
}
