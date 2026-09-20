import type { Metric, ReportData } from "@/types/schema";
import { formatNumber } from "@/lib/utils/format";

export type Effort = "låg" | "medel" | "hög";
export type Reward = "låg" | "medel" | "hög";

export interface NextStep {
  action: string;
  rationale: string;
  effort: Effort;
  reward: Reward;
}

/** A figure a suggestion rests on, straight from the report data, so the
 *  reader can inspect what the advice is built on. */
export interface Evidence {
  label: string;
  value: string;
  previous?: string;
}

export interface NextStepWithEvidence {
  step: NextStep;
  evidence: Evidence[];
}

function fact(metric: Metric | undefined, suffix = ""): Evidence | null {
  if (!metric) return null;
  return {
    label: metric.label,
    value: `${formatNumber(metric.value, metric.unit)}${suffix}`,
    previous: metric.previousValue !== undefined ? `${formatNumber(metric.previousValue, metric.unit)}${suffix}` : undefined,
  };
}

const facts = (...items: (Evidence | null)[]) => items.filter((e): e is Evidence => e !== null);

export function deriveNextStepsWithEvidence(data: ReportData): NextStepWithEvidence[] {
  const steps: NextStepWithEvidence[] = [];
  const traffic = data.trafficOverview;
  const seo = data.seoOverview;
  const paid = data.paidOverview;

  if (paid?.totalSpend && paid.roas) {
    steps.push({
      step: {
        action: "Skala upp de bäst presterande annonserna",
        rationale: `ROAS är ${formatNumber(paid.roas.value, "number")}× — kampanjerna är lönsamma och har utrymme att växa.`,
        effort: "låg",
        reward: "hög",
      },
      evidence: facts(fact(paid.roas, "×"), fact(paid.totalSpend), fact(paid.conversions), fact(paid.costPerConversion)),
    });
  }

  if (seo && seo.avgPosition.value > 8) {
    steps.push({
      step: {
        action: "Optimera de sidor som rankar på position 8–15",
        rationale: "Sidorna syns men klickas sällan. Bättre titlar och meta-texter kan ge snabb CTR-ökning.",
        effort: "medel",
        reward: "hög",
      },
      evidence: facts(fact(seo.avgPosition), fact(seo.totalImpressions), fact(seo.avgCtr)),
    });
  } else if (traffic?.organicSessions && traffic.organicSessions.trend === "down") {
    steps.push({
      step: {
        action: "Granska innehållet på de tio viktigaste organiska sidorna",
        rationale: "Organisk trafik tappade. Uppdaterat innehåll brukar återhämta positioner inom 4–6 veckor.",
        effort: "medel",
        reward: "medel",
      },
      evidence: facts(fact(traffic.organicSessions), fact(traffic.totalSessions)),
    });
  }

  if (traffic?.bounceRate && traffic.bounceRate.value > 50) {
    steps.push({
      step: {
        action: "Förbättra landningssidans relevans och laddningstid",
        rationale: `Avvisningsfrekvensen är ${formatNumber(traffic.bounceRate.value, "percent")} — besökarna lämnar utan att agera.`,
        effort: "medel",
        reward: "hög",
      },
      evidence: facts(fact(traffic.bounceRate), fact(traffic.totalSessions)),
    });
  } else if (!paid) {
    steps.push({
      step: {
        action: "Testa Google Ads med en liten budget",
        rationale: "Ni har stark organik men saknar betald trafik. Även 3 000 kr/mån ger värdefull data.",
        effort: "låg",
        reward: "medel",
      },
      evidence: facts(fact(traffic?.organicSessions), fact(traffic?.totalSessions)),
    });
  }

  return steps.slice(0, 3);
}

/** The steps alone — what the insights prompt and older callers consume. */
export function deriveNextSteps(data: ReportData): NextStep[] {
  return deriveNextStepsWithEvidence(data).map((s) => s.step);
}
