"use client";

import { Compass, Lightbulb, TrendingUp } from "lucide-react";
import Link from "next/link";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { type AiInsightsPayload, AI_INSIGHTS_FALLBACK_TEXT } from "@/lib/ai-insights/types";
import { type SlideData } from "../slide-data";
import { TREND_POS, TREND_POS_BG, ACCENT } from "../tokens";
import { SlideHeading } from "../primitives/SlideHeading";

export function SlideRecap({
  d,
  aiInsights,
}: {
  d: SlideData;
  aiInsights: AiInsightsPayload | null;
}) {
  const aiRecap = aiInsights?.slide_recap;
  const bullets = [
    {
      t: "Trafiken växer",
      b: "Google fortsätter driva tillväxten — håll publiceringstempot.",
      positive: true,
    },
    {
      t: "Engagemanget behöver omsorg",
      b: "Besökstiden sjunker. Innehåll och layout är värt att se över.",
      positive: false,
    },
    {
      t: "AI-synligheten är omätt",
      b: "Aktivera spårning för att inte missa nästa söktrend.",
      positive: false,
    },
  ].map((bullet, index) => ({
    ...bullet,
    b: aiRecap === null
      ? AI_INSIGHTS_FALLBACK_TEXT
      : aiRecap?.[index]?.body ?? bullet.b,
  }));

  return (
    <div className="grid h-full content-center gap-10 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-6">
        <SlideHeading sub="Tre rader att ta med sig från perioden.">
          Tre saker att komma ihåg
        </SlideHeading>
        <ul className="space-y-4">
          {bullets.map((b) => (
            <li
              key={b.t}
              className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 p-4 sm:p-5"
            >
              <span
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: b.positive
                    ? TREND_POS_BG
                    : "oklch(0.94 0.04 60 / 0.6)",
                  color: b.positive ? TREND_POS : "oklch(0.55 0.14 60)",
                }}
              >
                {b.positive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <Compass className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="font-semibold">{b.t}</p>
                <p className="mt-1 text-[20px] text-foreground">{b.b}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="relative overflow-hidden flex flex-col justify-between gap-6 rounded-3xl border border-white/20 p-8 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)]"
        style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10 flex flex-col justify-between gap-6 flex-1">
          <div>
            <p className="text-[16px] font-semibold uppercase tracking-[0.24em] text-white">
              Vill du ha hjälp att gå från insikt till handling?
            </p>
            <h2 className="mt-4 font-display text-4xl tracking-tight text-white sm:text-5xl">
              Boka en kort genomgång — vi går igenom rapporten tillsammans.
            </h2>
            <p className="mt-3 text-[20px] text-white">
              30 minuter. Inga säljpitcher. Bara konkreta nästa steg för din sida.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
              style={{ background: ACCENT }}
            >
              <Lightbulb className="h-4 w-4" />
              Boka strategigenomgång
            </button>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-5 py-3 text-sm font-semibold hover:bg-muted"
            >
              Se detaljerad rapport
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
