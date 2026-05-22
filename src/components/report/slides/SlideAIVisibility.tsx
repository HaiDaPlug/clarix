"use client";

import { Bot } from "lucide-react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { ACCENT } from "../tokens";
import { SlideHeading } from "../primitives/SlideHeading";

export function SlideAIVisibility() {
  const sources = [
    { n: "ChatGPT", state: "Ej spårat" },
    { n: "Perplexity", state: "Ej spårat" },
    { n: "Gemini", state: "Ej spårat" },
    { n: "Claude", state: "Ej spårat" },
  ];
  return (
    <div className="grid h-full content-center gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <SlideHeading sub="ChatGPT, Perplexity och Gemini skickar redan trafik — men syns inte i vanliga rapporter.">
          AI-synligheten är just nu okänd
        </SlideHeading>
        <ul className="space-y-2.5 text-base text-foreground sm:text-lg">
          {[
            "ChatGPT-trafik är inte spårad",
            "Perplexity-hänvisningar mäts inte",
            "Möjligheten i AI-sök är inte bevakad",
          ].map((txt) => (
            <li key={txt} className="flex items-start gap-3">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: ACCENT }}
              />
              {txt}
            </li>
          ))}
        </ul>
        <button
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: ACCENT }}
        >
          <Bot className="h-4 w-4" />
          Aktivera AI-synlighet
        </button>
      </div>
      <div
        className="relative overflow-hidden rounded-3xl border border-white/20 p-7 shadow-[0_24px_60px_-26px_rgba(255,107,85,0.45)]"
        style={{ background: "linear-gradient(135deg, #e8336d 0%, #ff6b35 50%, #ffb830 100%)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
            Status per AI-källa
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {sources.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/20 bg-white/15 p-4 backdrop-blur"
              >
                <p className="text-sm font-semibold text-white">{s.n}</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-white/80">
                  —
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
                  {s.state}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
