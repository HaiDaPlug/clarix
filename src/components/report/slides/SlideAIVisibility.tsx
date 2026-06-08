"use client";

import { Bot } from "lucide-react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { ACCENT, AI_GRADIENT, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER, AI_SHIMMER } from "../tokens";
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
        className="relative overflow-hidden rounded-3xl p-7"
        style={{ background: AI_GRADIENT, border: `1px solid ${AI_BORDER}`, boxShadow: "0 24px 60px -26px rgba(139,92,246,0.25)" }}
      >
        <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5), transparent 70%)" }} />
        <svg aria-hidden className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-0" width="500" height="500" viewBox="0 0 500 500" fill="none"><circle cx="250" cy="250" r="120" stroke="oklch(0.62 0.22 295)" strokeWidth="1.5" opacity="0.25" /><circle cx="250" cy="250" r="180" stroke="oklch(0.62 0.22 295)" strokeWidth="1" opacity="0.15" /><circle cx="250" cy="250" r="240" stroke="oklch(0.62 0.22 295)" strokeWidth="0.75" opacity="0.08" /></svg>
        <NoiseTexture preset="fine" blendMode="soft-light" opacity={0.45} />
        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: AI_TEXT_SECONDARY }}>
            Status per AI-källa
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {sources.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl p-4 backdrop-blur"
                style={{ border: `1px solid ${AI_BORDER}`, background: AI_SHIMMER }}
              >
                <p className="text-sm font-semibold" style={{ color: AI_TEXT_PRIMARY }}>{s.n}</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight" style={{ color: AI_TEXT_SECONDARY }}>
                  —
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: AI_TEXT_SECONDARY }}>
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
