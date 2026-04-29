import { ReportData } from "@/types/schema";
import { AssembledDeck, AssembledSlide, DeckSection, MissingModule } from "@/types/modules";
import { evaluateEligibility } from "./eligibility";
import { moduleRegistry } from "@/lib/modules/registry";

// The fixed narrative spine — sections always appear in this order
const SECTION_ORDER: DeckSection[] = [
  "cover",
  "summary",
  "snapshot",
  "acquisition",
  "performance",
  "issues",
  "actions",
  "appendix",
];

// Map module category -> deck section
const CATEGORY_TO_SECTION: Record<string, DeckSection> = {
  structure: "cover",
  summary: "summary",
  snapshot: "snapshot",
  acquisition: "acquisition",
  visibility: "acquisition",
  performance: "performance",
  paid: "performance",
  conversion: "performance",
  health: "issues",
  actions: "actions",
};

export function assembleDeck(data: ReportData): AssembledDeck {
  const modules = moduleRegistry;

  // Evaluate eligibility for each module
  const eligibleSlides: AssembledSlide[] = [];
  const missingModules: MissingModule[] = [];

  for (const mod of modules) {
    const eligibility = evaluateEligibility(mod, data);

    if (!eligibility.eligible) {
      if (mod.businessCriticality === "critical" || mod.businessCriticality === "important") {
        missingModules.push({
          moduleId: mod.id,
          moduleName: mod.name,
          businessCriticality: mod.businessCriticality,
          missingRequired: eligibility.missingRequired,
          missingOptional: eligibility.missingOptional,
          reason: eligibility.reason ?? "Module not eligible for this report configuration.",
          recommendedFix: mod.requiredSources.length > 0
            ? `Connect ${mod.requiredSources.join(", ")} to unlock this insight.`
            : undefined,
        });
      }
      continue;
    }

    const section: DeckSection = CATEGORY_TO_SECTION[mod.category] ?? "appendix";

    eligibleSlides.push({
      moduleId: mod.id,
      module: mod,
      eligibility,
      order: 0,
      section,
    });
  }

  // Sort by section order, then by module priority within section
  eligibleSlides.sort((a, b) => {
    const sectionA = SECTION_ORDER.indexOf(a.section);
    const sectionB = SECTION_ORDER.indexOf(b.section);
    if (sectionA !== sectionB) return sectionA - sectionB;
    return a.module.priority - b.module.priority;
  });

  // Assign final order
  eligibleSlides.forEach((slide, i) => {
    slide.order = i;
  });

  return {
    slides: eligibleSlides,
    missingModules,
    reportData: data,
    generatedAt: new Date().toISOString(),
  };
}

export function getSlideCount(data: ReportData): number {
  return assembleDeck(data).slides.length;
}
