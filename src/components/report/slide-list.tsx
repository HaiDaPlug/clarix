"use client";

import { deriveInsights } from "@/lib/engine/derive-insights";
import { deriveSlideHeadline } from "@/lib/engine/slide-headlines";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import type { ReportData } from "@/types/schema";
import { type SlideData } from "./slide-data";
import { SlideIntro } from "./slides/SlideIntro";
import { SlideHero } from "./slides/SlideHero";
import { SlideKpis } from "./slides/SlideKpis";
import { SlideChannels } from "./slides/SlideChannels";
import { SlidePages } from "./slides/SlidePages";
import { SlideStrategicInsight } from "./slides/SlideStrategicInsight";
import { SlideRecommendations } from "./slides/SlideRecommendations";
import { SlideConversion } from "./slides/SlideConversion";
import { SlideRecap } from "./slides/SlideRecap";

export function buildSlides(
  d: SlideData,
  reportData: ReportData | null,
  aiInsights: AiInsightsPayload | null,
) {
  const insights = reportData ? deriveInsights(reportData) : [];
  const headline = deriveSlideHeadline(insights);
  // AI-only slides are left out when generation returned nothing for them
  // (null payload = still loading, so they stay and show their placeholders).
  const aiReady = aiInsights !== null;
  const hasSteps = !aiReady || !!aiInsights.slide_next_steps?.length;
  const hasRecap = !aiReady || !!aiInsights.slide_recap?.length;
  return [
    { id: "intro", title: "Introduktion", render: () => <SlideIntro d={d} /> },
    { id: "hero", title: "Sammanfattning", render: () => <SlideHero d={d} headline={headline} aiInsights={aiInsights} reportData={reportData} /> },
    { id: "kpis", title: "Nyckeltal", render: () => <SlideKpis d={d} /> },
    { id: "channels", title: "Trafikkällor", render: () => <SlideChannels d={d} /> },
    { id: "conv", title: "Konvertering", render: () => <SlideConversion d={d} /> },
    { id: "pages", title: "Bästa sidor", render: () => <SlidePages d={d} /> },
    { id: "insight", title: "Strategisk bedömning", render: () => <SlideStrategicInsight aiInsights={aiInsights} insights={insights} /> },
    ...(hasSteps ? [{ id: "recs", title: "Nästa steg", render: () => <SlideRecommendations aiInsights={aiInsights} reportData={reportData} /> }] : []),
    ...(hasRecap ? [{ id: "recap", title: "Kort summerat", render: () => <SlideRecap aiInsights={aiInsights} /> }] : []),
  ];
}
