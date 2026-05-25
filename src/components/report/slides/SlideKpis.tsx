"use client";

import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { type SlideData } from "../slide-data";
import { TrendPill, fmtNum, sign } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";

function fmtDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "–";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} s`;
  return `${m} min ${s} s`;
}

export function SlideKpis({ d }: { d: SlideData }) {
  const kpis = [
    {
      l: "Besök",
      v: fmtNum(d.visits),
      d: sign(d.trafficDelta),
      p: (d.trafficDelta ?? null) !== null && d.trafficDelta! > 0,
      tip: { title: "Vad är ett besök?", body: "Varje gång någon laddar sidan räknas det som ett besök — oavsett om de har varit inne förut.", example: "Samma person som besöker tre gånger = 3 besök." },
    },
    {
      l: "Antal personer",
      v: fmtNum(d.people),
      d: sign(d.peopleDelta),
      p: (d.peopleDelta ?? null) !== null && d.peopleDelta! > 0,
      tip: { title: "Vad betyder antal personer?", body: "En person räknas bara en gång, även om den besöker flera gånger.", example: "1 person som går in 3 gånger = 3 besök, men bara 1 person här." },
    },
    {
      l: "Tid på sidan",
      v: fmtDuration(d.avgDuration),
      d: sign(d.timeDelta),
      p: (d.timeDelta ?? null) !== null && d.timeDelta! > 0,
      tip: { title: "Genomsnittlig besökstid", body: "Hur länge en genomsnittlig besökare stannar. Längre tid betyder att folk hittar det de söker.", example: "2 min 14 s innebär att besökarna läser — inte bara studsar vidare." },
    },
    {
      l: "Leads",
      v: fmtNum(d.leads),
      d: sign(d.leadsDelta),
      p: (d.leadsDelta ?? null) !== null && d.leadsDelta! > 0,
      tip: { title: "Vad räknas som ett lead?", body: "Varje registrerad konvertering — t.ex. ifyllt kontaktformulär, telefonklick eller köp.", example: "Kräver att konverteringsspårning är aktiverat i Google Analytics." },
    },
  ];
  return (
    <div className="space-y-8">
      <SlideHeading sub="Så ser perioden ut i siffror — jämfört med föregående månad.">
        Snabb överblick
      </SlideHeading>
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {kpis.map((k) => (
          <div
            key={k.l}
            className="flex h-full min-h-[200px] flex-col rounded-3xl border border-border bg-background/85 p-6 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[20px] font-semibold sm:text-[22px]">{k.l}</p>
                <InfoTooltip title={k.tip.title} body={k.tip.body} example={k.tip.example} side="above" />
              </div>
              <TrendPill delta={k.d} positive={k.p} size="md" />
            </div>
            <p className="mt-auto pt-6 font-display text-[4.2rem] font-semibold leading-none tracking-tight tabular-nums">
              {k.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
