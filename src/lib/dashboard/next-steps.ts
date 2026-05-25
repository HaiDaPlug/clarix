import type { ReportData } from "@/types/schema";
import { formatNumber } from "@/lib/utils/format";

export type Effort = "låg" | "medel" | "hög";
export type Reward = "låg" | "medel" | "hög";

export interface NextStep {
  action: string;
  rationale: string;
  effort: Effort;
  reward: Reward;
}

export function deriveNextSteps(data: ReportData): NextStep[] {
  const steps: NextStep[] = [];
  const traffic = data.trafficOverview;
  const seo = data.seoOverview;
  const paid = data.paidOverview;

  if (paid?.totalSpend && paid.roas) {
    steps.push({
      action: "Skala upp de bäst presterande annonserna",
      rationale: `ROAS är ${formatNumber(paid.roas.value, "number")}× — kampanjerna är lönsamma och har utrymme att växa.`,
      effort: "låg",
      reward: "hög",
    });
  }

  if (seo && seo.avgPosition.value > 8) {
    steps.push({
      action: "Optimera de sidor som rankar på position 8–15",
      rationale: "Sidorna syns men klickas sällan. Bättre titlar och meta-texter kan ge snabb CTR-ökning.",
      effort: "medel",
      reward: "hög",
    });
  } else if (traffic?.organicSessions && traffic.organicSessions.trend === "down") {
    steps.push({
      action: "Granska innehållet på de tio viktigaste organiska sidorna",
      rationale: "Organisk trafik tappade. Uppdaterat innehåll brukar återhämta positioner inom 4–6 veckor.",
      effort: "medel",
      reward: "medel",
    });
  }

  if (traffic?.bounceRate && traffic.bounceRate.value > 50) {
    steps.push({
      action: "Förbättra landningssidans relevans och laddningstid",
      rationale: `Avvisningsfrekvensen är ${formatNumber(traffic.bounceRate.value, "percent")} — besökarna lämnar utan att agera.`,
      effort: "medel",
      reward: "hög",
    });
  } else if (!paid) {
    steps.push({
      action: "Testa Google Ads med en liten budget",
      rationale: "Ni har stark organik men saknar betald trafik. Även 3 000 kr/mån ger värdefull data.",
      effort: "låg",
      reward: "medel",
    });
  }

  return steps.slice(0, 3);
}
