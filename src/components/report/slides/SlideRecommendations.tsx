"use client";

import { PenSquare, Target, Zap } from "lucide-react";
import { type AiInsightsPayload, AI_INSIGHTS_FALLBACK_TEXT } from "@/lib/ai-insights/types";
import { SlideHeading } from "../primitives/SlideHeading";

export function SlideRecommendations({ aiInsights }: { aiInsights: AiInsightsPayload | null }) {
  const aiRecs = aiInsights?.slide_recs;
  const actions = [
    {
      tag: "Skala",
      icon: Zap,
      t: "Dubbla det som fungerar",
      b: "SEO-guiden drar 4 200 besök. Tre likvärdiga guider kan dubbla SEO-trafiken på ett kvartal.",
    },
    {
      tag: "Fixa",
      icon: Target,
      t: "Tät läckan vid kontakt",
      b: "Kontaktsidan tappar trafik. Tydligare CTA + kortare formulär kan återta förlorade leads.",
    },
    {
      tag: "Bygg",
      icon: PenSquare,
      t: "Bygg momentum",
      b: "Publicera 1 artikel i veckan. Konsekvensen har gett +14 % senaste perioden — håll tempot.",
    },
  ];
  return (
    <div className="space-y-7">
      <div>
        <SlideHeading sub="Tre fokusområden att prioritera den närmaste perioden.">
          Rekommenderade fokusområden
        </SlideHeading>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a, index) => {
          const Icon = a.icon;
          const body = aiRecs === null
            ? AI_INSIGHTS_FALLBACK_TEXT
            : aiRecs?.[index]?.body ?? a.b;
          return (
            <div
              key={a.t}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-background/95 p-7 shadow-[0_4px_8px_rgba(15,23,42,0.03),0_18px_44px_-22px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #FF4D9E 0%, #FF6B55 50%, #FFB830 100%)" }}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground">
                  {a.tag}
                </span>
              </div>
              <h3 className="mt-6 font-display text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">
                {a.t}
              </h3>
              <p className="mt-3 text-[21px] leading-relaxed text-foreground">
                {body}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
