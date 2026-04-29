import { AssembledDashboard, DashboardNudge } from "@/types/dashboard";
import { ReportData } from "@/types/schema";
import { dashboardRegistry } from "@/lib/dashboard/registry";
import { evaluateDashboardEligibility } from "@/lib/dashboard/eligibility";
import type { Translations } from "@/lib/i18n";

const NUDGE_PRIORITY: DashboardNudge["source"][] = ["ga4", "gsc", "google_ads"];

function getDashboardNudge(
  data: ReportData,
  t: Translations
): DashboardNudge | undefined {
  const source = NUDGE_PRIORITY.find(
    (candidate) => !data.meta.availableSources.includes(candidate)
  );

  if (!source) return undefined;

  return {
    source,
    message: t.dashboard.nudge[source],
  };
}

export function assembleDashboard(data: ReportData, t: Translations): AssembledDashboard {
  const items = dashboardRegistry
    .map((definition) => ({
      definition,
      eligibility: evaluateDashboardEligibility(definition, data),
    }))
    .filter(({ eligibility }) => eligibility.eligible)
    .sort((a, b) => a.definition.priority - b.definition.priority)
    .map(({ definition, eligibility }, order) => ({
      itemId: definition.id,
      definition,
      eligibility,
      order,
    }));

  return {
    items,
    nudge: getDashboardNudge(data, t),
    reportData: data,
    generatedAt: new Date().toISOString(),
  };
}
