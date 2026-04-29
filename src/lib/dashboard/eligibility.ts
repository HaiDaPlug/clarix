import { DashboardDefinition, DashboardEligibilityResult } from "@/types/dashboard";
import { ReportData } from "@/types/schema";
import { checkFields } from "@/lib/utils/field-check";

export function evaluateDashboardEligibility(
  definition: DashboardDefinition,
  data: ReportData
): DashboardEligibilityResult {
  const missingSources = definition.requiredSources.filter(
    (source) => !data.meta.availableSources.includes(source)
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

  const required = checkFields(data, definition.requiredDataFields);
  const alternative = definition.alternativeRequiredDataFields
    ? checkFields(data, definition.alternativeRequiredDataFields.fields)
    : undefined;

  const primaryRequirementMet = required.missing.length === 0;
  const alternativeRequirementMet = definition.alternativeRequiredDataFields
    ? (alternative?.present.length ?? 0) >= definition.alternativeRequiredDataFields.minPresent
    : false;

  if (!primaryRequirementMet && !alternativeRequirementMet) {
    const missingRequired = definition.alternativeRequiredDataFields
      ? [
          ...required.missing,
          definition.alternativeRequiredDataFields.description,
        ]
      : required.missing;

    return {
      eligible: false,
      variant: "minimal",
      missingRequired,
      missingOptional: [],
      reason: `Missing required data fields: ${missingRequired.join(", ")}`,
    };
  }

  const optional = checkFields(data, definition.optionalDataFields);
  const variant =
    definition.optionalDataFields.length > 0 &&
    optional.present.length < definition.optionalDataFields.length / 2
      ? "simplified"
      : "full";

  return {
    eligible: true,
    variant,
    missingRequired: [],
    missingOptional: optional.missing,
  };
}
