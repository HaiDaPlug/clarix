import { ReportData } from "@/types/schema";
import type { Locale } from "@/lib/i18n";

type LocalizedReportContent = Partial<
  Pick<ReportData, "executiveSummary" | "kpiSnapshot">
> & {
  meta?: Partial<ReportData["meta"]>;
};

const localizedReports: Record<string, Partial<Record<Locale, LocalizedReportContent>>> = {
  rpt_scenario_1: {
    en: {
      meta: {
        period: {
          label: "March 2026",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
        },
      },
      executiveSummary: {
        headline: "Organic traffic grew 18% and SEO momentum is building.",
        subheadline: "March was a strong month for visibility. Top-of-funnel growth is accelerating.",
        paragraphs: [
          "Bergstrom & Co saw meaningful organic traffic growth in March, driven primarily by improved rankings for high-intent product queries. Sessions from organic search increased 18% month over month.",
          "CTR improved across most tracked keywords, and several category pages moved into the top 5 for the first time. Two pages require attention due to declining positions.",
        ],
        highlights: [
          { label: "Organic sessions", value: "+18%", sentiment: "positive" },
          { label: "Avg. position", value: "11.2 -> 9.4", sentiment: "positive" },
          { label: "CTR", value: "3.1%", sentiment: "neutral" },
        ],
        aiSummary: {
          whatHappened:
            "Organic traffic grew 18% MoM, driven by ranking improvements in key product categories.",
          whyItMatters:
            "If sustained, this trend points to 35-40% more organic leads by Q3.",
          nextStep:
            "Prioritize content improvements on the two declining category pages before the next indexing cycle.",
        },
      },
      kpiSnapshot: {
        period: "March 2026",
        comparisonPeriod: "February 2026",
        metrics: [],
      },
    },
  },
  rpt_scenario_2: {
    en: {
      meta: {
        period: {
          label: "March 2026",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
        },
      },
      executiveSummary: {
        headline: "Strong paid performance offset a softer organic month.",
        subheadline:
          "Google Ads delivered 24% more leads at a lower cost per lead. Organic visibility held steady with minor position dips.",
        paragraphs: [
          "March showed a clear split between channels: paid search outperformed while organic visibility flattened. Google Ads drove 340 conversions at a cost per lead 12% below target.",
          "Organic click volume declined slightly due to lower seasonal demand. Positions remain stable and no structural SEO issues were identified.",
        ],
        highlights: [
          { label: "Paid conversions", value: "+24%", sentiment: "positive" },
          { label: "Cost per lead", value: "-12%", sentiment: "positive" },
          { label: "Organic sessions", value: "-3%", sentiment: "negative" },
        ],
        aiSummary: {
          whatHappened:
            "Paid search drove 340 conversions at 12% lower CPL than target. Organic traffic declined 3% due to seasonal demand.",
          whyItMatters:
            "The paid efficiency gain is material and should influence Q2 budget allocation.",
          nextStep:
            "Scale the top-performing paid campaigns by 20% and audit the five most important organic pages.",
        },
      },
      kpiSnapshot: {
        period: "March 2026",
        comparisonPeriod: "February 2026",
        metrics: [],
      },
    },
  },
  rpt_scenario_3: {
    en: {
      meta: {
        period: {
          label: "March 2026",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
        },
      },
      executiveSummary: {
        headline: "Data is partial, but the search trend is positive.",
        subheadline:
          "This report is based on manually entered data and Google Search Console. GA4 connection is still pending.",
        paragraphs: [
          "Eklund Fastigheter's visibility data from Google Search Console shows positive development in March. Full traffic analytics will be available once GA4 is connected.",
        ],
        highlights: [
          { label: "GSC clicks", value: "+11%", sentiment: "positive" },
          { label: "Data sources", value: "Partial", sentiment: "neutral" },
        ],
      },
      kpiSnapshot: {
        period: "March 2026",
        metrics: [],
      },
    },
  },
};

export function localizeMockReportData(data: ReportData, locale: Locale): ReportData {
  const localized = localizedReports[data.meta.id]?.[locale];
  if (!localized) return data;

  return {
    ...data,
    meta: {
      ...data.meta,
      ...localized.meta,
      period: localized.meta?.period ?? data.meta.period,
    },
    executiveSummary: localized.executiveSummary ?? data.executiveSummary,
    kpiSnapshot:
      localized.kpiSnapshot && data.kpiSnapshot
        ? {
            ...data.kpiSnapshot,
            period: localized.kpiSnapshot.period ?? data.kpiSnapshot.period,
            comparisonPeriod:
              localized.kpiSnapshot.comparisonPeriod ??
              data.kpiSnapshot.comparisonPeriod,
          }
        : data.kpiSnapshot,
  };
}
