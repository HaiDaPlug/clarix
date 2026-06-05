"use client";

import { CheckCircle2, Plug } from "lucide-react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { type SlideData } from "../slide-data";
import { TREND_POS, ACCENT, AI_GRADIENT, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER } from "../tokens";
import { fmtNum, sign } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";

export function SlideConversion({ d }: { d: SlideData }) {
  if (d.hasConversions) {
    return (
      <div className="space-y-7">
        <div>
          <SlideHeading sub="Senaste perioden — alla mätta konverteringar.">
            Affären bakom trafiken
          </SlideHeading>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { l: "Konverteringar", v: fmtNum(d.leads), dd: sign(d.leadsDelta) },
            { l: "Bästa kanal", v: "Google SEO", dd: "42 %" },
            { l: "Värde per lead", v: "—", dd: "" },
          ].map((m) => (
            <div
              key={m.l}
              className="rounded-3xl border border-border bg-background/85 p-6"
            >
              <p className="text-sm text-foreground">{m.l}</p>
              <p className="mt-2 font-display text-3xl tracking-tight">{m.v}</p>
              {m.dd && (
                <p className="mt-1 text-xs font-medium" style={{ color: TREND_POS }}>
                  {m.dd}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-full content-center gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <SlideHeading sub="Just nu mäter vi besök — men inte vad de leder till.">
          Du ser trafiken — men inte affären
        </SlideHeading>
        <p className="max-w-xl text-base leading-relaxed text-foreground sm:text-lg">
          Konverteringsspårning är inte aktiverat ännu. Med spårning på plats
          kan vi koppla varje besök till leads, samtal och köp — och visa exakt
          vilka kanaler som faktiskt driver affärer.
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: ACCENT }}
        >
          <Plug className="h-4 w-4" />
          Koppla på konverteringsspårning
        </button>
      </div>
      <div
        className="relative overflow-hidden rounded-3xl p-8 flex flex-col justify-center"
        style={{ background: AI_GRADIENT, border: `1px solid ${AI_BORDER}`, boxShadow: "0 24px 60px -26px rgba(139,92,246,0.25)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] mb-5" style={{ color: AI_TEXT_SECONDARY }}>
            Vad du får
          </p>
          <ul className="space-y-4">
            {[
              "Antal leads per kanal",
              "Värde per kanal i kronor",
              "Vilka sidor som faktiskt genererar affärer",
              "Bästa kampanj baserat på riktig data",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: ACCENT }} />
                <span className="text-[22px] font-semibold" style={{ color: AI_TEXT_PRIMARY }}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
