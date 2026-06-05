"use client";

import { NoiseTexture } from "@/components/ui/noise-texture";
import { type AiInsightsPayload } from "@/lib/ai-insights/types";
import { withPeriod } from "@/lib/utils/text";
import { highlightNumbers } from "@/lib/utils/highlight-numbers";
import { TREND_POS, TREND_NEG, ACCENT, AI_GRADIENT, AI_TEXT_PRIMARY, AI_TEXT_SECONDARY, AI_BORDER, AI_SHIMMER } from "../tokens";

export function SlideStrategicInsight({
  aiInsights,
}: {
  aiInsights: AiInsightsPayload | null;
}) {
  const aiInsight = aiInsights?.slide_insight;
  const signals = [
    {
      label: "Trafiken växer",
      body: "Google driver merparten av ökningen. Det beror på konsekvens — håll publiceringstempot uppe.",
      positive: true,
    },
    {
      label: "Engagemanget sjunker",
      body: "Fler hittar sidan, men stannar kortare. Det kan betyda att innehållet inte matchar det besökarna söker.",
      positive: false,
    },
    {
      label: "Kontaktsidan tappade synlighet",
      body: "Det är sidan där leads konverterar. En svagare ingång dit påverkar affären direkt.",
      positive: false,
    },
  ];

  return (
    <div className="grid h-full grid-cols-[1fr_1.05fr] gap-6 content-center">
      {/* Left: heading + signal list */}
      <div className="flex flex-col justify-center gap-6">
        <div>
          <h1 className="font-display text-[2.9rem] font-bold leading-[1.05] tracking-tight lg:text-[3.4rem]">
            Synligheten ökar.<br />Affärsvärdet fångas inte fullt ut<span style={{ color: "#FF6B55" }}>.</span>
          </h1>
          <p className="mt-3 text-[20px] text-foreground leading-relaxed">
            Vad siffrorna faktiskt betyder för er, bortom dashboarden.
          </p>
        </div>
        <ul className="space-y-3">
          {signals.map((s) => (
            <li
              key={s.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 px-5 py-4"
            >
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: s.positive ? TREND_POS : TREND_NEG, marginTop: 10 }}
              />
              <div>
                <p className="font-semibold text-[19px]">{s.label}</p>
                <p className="mt-0.5 text-[18px] leading-relaxed text-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: expanded summary card */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 flex flex-col justify-between"
        style={{ background: AI_GRADIENT, border: `1px solid ${AI_BORDER}`, boxShadow: "0 24px 60px -26px rgba(139,92,246,0.25)" }}
      >
        <NoiseTexture preset="cinematic" blendMode="overlay" />
        <div className="relative z-10 flex flex-col h-full gap-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: AI_TEXT_SECONDARY }}>
            Det vi ser just nu
          </p>
          <div className="flex-1 space-y-4 text-[1.15rem] font-medium leading-[1.65] tracking-[-0.01em]" style={{ color: AI_TEXT_PRIMARY }}>
            {aiInsights === null ? (
              <div className="flex flex-col gap-3">
                {[90, 80, 65].map((w, i) => <div key={i} className="h-4 rounded-full animate-pulse" style={{ width: `${w}%`, background: AI_SHIMMER }} />)}
              </div>
            ) : aiInsight ? (
              aiInsight.body.map((paragraph) => <p key={paragraph}>{highlightNumbers(withPeriod(paragraph), "light")}</p>)
            ) : (
              <>
                <p>Trafiken ökar — men trafik som inte konverterar är bara en kostnad utan avkastning. Det intressanta den här perioden är gapet som börjar öppna sig mellan synlighet och affärseffekt.</p>
                <p>Sjunkande engagemang i kombination med en svagare kontaktsida är ett klassiskt mönster: ni når fler, men budskapet eller flödet håller inte besökaren kvar tillräckligt länge för att ett beslut ska fattas.</p>
                <p>Nästa steg är inte mer trafik. Det är att förstå varför de som redan hittar er väljer att lämna.</p>
              </>
            )}
          </div>
          <div className="flex items-start gap-3 pt-4" style={{ borderTop: `1px solid ${AI_BORDER}` }}>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-white"
              style={{ background: ACCENT }}
            >
              Bottom line
            </span>
            <p className="font-semibold text-[1.05rem] leading-snug" style={{ color: AI_TEXT_PRIMARY }}>
              {aiInsights === null
                ? <span className="block h-4 w-[75%] rounded-full animate-pulse" style={{ background: AI_SHIMMER }} />
                : highlightNumbers(withPeriod(aiInsight?.bottom_line ?? "Synligheten förbättras. Men om engagemanget fortsätter sjunka och kontaktsidan inte återhämtar sig, riskerar ni att trafiktillväxten inte omvandlas till affärer."), "light")
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
