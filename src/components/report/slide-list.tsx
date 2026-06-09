"use client";

import { deriveInsights } from "@/lib/engine/derive-insights";
import { deriveSlideHeadline } from "@/lib/engine/slide-headlines";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import type { ReportData } from "@/types/schema";
import { type SlideData } from "./slide-data";
import { SlideHero } from "./slides/SlideHero";
import { SlideKpis } from "./slides/SlideKpis";
import { SlideTrend } from "./slides/SlideTrend";
import { SlideChannels } from "./slides/SlideChannels";
import { SlidePages } from "./slides/SlidePages";
import { SlideStrategicInsight } from "./slides/SlideStrategicInsight";
import { SlideRecommendations } from "./slides/SlideRecommendations";
import { SlideConversion } from "./slides/SlideConversion";
import { SlideAIVisibility } from "./slides/SlideAIVisibility";
import { SlideRecap } from "./slides/SlideRecap";

export function buildSlides(
  d: SlideData,
  reportData: ReportData | null,
  aiInsights: AiInsightsPayload | null,
) {
  const insights = reportData ? deriveInsights(reportData) : [];
  const headline = deriveSlideHeadline(insights);
  return [
    { id: "hero", title: "Sammanfattning", render: () => <SlideHero d={d} headline={headline} aiInsights={aiInsights} /> },
    { id: "kpis", title: "Nyckeltal", render: () => <SlideKpis d={d} /> },
    { id: "trend", title: "Trafikutveckling", render: () => <SlideTrend d={d} /> },
    { id: "channels", title: "Trafikkällor", render: () => <SlideChannels d={d} /> },
    { id: "pages", title: "Bästa sidor", render: () => <SlidePages d={d} /> },
    { id: "insight", title: "Strategisk bedömning", render: () => <SlideStrategicInsight aiInsights={aiInsights} insights={insights} /> },
    { id: "recs", title: "Rekommendationer", render: () => <SlideRecommendations aiInsights={aiInsights} /> },
    { id: "conv", title: "Konvertering", render: () => <SlideConversion d={d} /> },
    { id: "ai", title: "AI-synlighet", render: () => <SlideAIVisibility /> },
    { id: "recap", title: "Kort summerat", render: () => <SlideRecap aiInsights={aiInsights} /> },
  ];
}
