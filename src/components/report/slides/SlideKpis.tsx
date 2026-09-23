"use client";

import { motion } from "motion/react";
import { InfoTooltip } from "@/components/primitives/InfoTooltip";
import { NumberTicker } from "@/components/ui/number-ticker";
import { type SlideData } from "../slide-data";
import { channelColor } from "../channel-colors";
import { TrendPill, fmtNum, sign } from "../primitives/TrendPill";
import { SlideHeading } from "../primitives/SlideHeading";
import { useSlideReveal, fadeUp } from "../primitives/reveal";

const STAT = "font-stat text-[5rem] font-semibold leading-none tracking-tight tabular-nums";

/** Stand-in for a value that does not exist yet. A long, thin rule reads as
 *  "nothing measured" where a 5rem "0" would read as a real, dismal result.
 *  Full-strength foreground: it is a value, not a disabled state. */
function Dash() {
  return <span className="block h-[0.25rem] w-[5.5rem] rounded-full bg-foreground" />;
}

export function SlideKpis({ d }: { d: SlideData }) {
  const { ref, active, reduced } = useSlideReveal();

  // The biggest channel — topChannels is already sorted by visits upstream.
  const topChannel = d.topChannels[0] ?? null;
  const TopIcon = topChannel?.icon;
  // No leads is never a real zero here: it means conversion tracking is off, so
  // the card shows a dash and says how to start measuring instead of a hard 0.
  const noLeads = !d.leads;

  const kpis = [
    {
      l: "Besök",
      d: sign(d.trafficDelta),
      p: (d.trafficDelta ?? null) !== null && d.trafficDelta! > 0,
      tip: { title: "Vad är ett besök?", body: "Varje gång någon laddar sidan räknas det som ett besök — oavsett om de har varit inne förut.", example: "Samma person som besöker tre gånger = 3 besök." },
      body: (
        <p className={`mt-auto pt-6 ${STAT}`}>
          <NumberTicker value={d.visits} format={fmtNum} />
        </p>
      ),
    },
    {
      l: "Antal personer",
      d: sign(d.peopleDelta),
      p: (d.peopleDelta ?? null) !== null && d.peopleDelta! > 0,
      tip: { title: "Vad betyder antal personer?", body: "En person räknas bara en gång, även om den besöker flera gånger.", example: "1 person som går in 3 gånger = 3 besök, men bara 1 person här." },
      body: (
        <p className={`mt-auto pt-6 ${STAT}`}>
          <NumberTicker value={d.people} format={fmtNum} />
        </p>
      ),
    },
    {
      l: "Din populäraste kanal",
      d: sign(topChannel?.delta ?? null),
      p: (topChannel?.delta ?? 0) > 0,
      tip: { title: "Vad betyder populäraste kanal?", body: "Kanalen som skickade flest besökare till sidan under perioden — alltså vägen folk faktiskt hittar er på.", example: "Är det Google (obetalt) hittar folk er via sökning; är det Direkt skriver de in adressen själva." },
      body: topChannel && TopIcon ? (
        <div className="mt-auto flex items-center gap-4 pt-6">
          <div
            className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[24px]"
            style={{ background: `${channelColor(topChannel.name)}20` }}
          >
            <TopIcon className="h-9 w-9" style={{ color: channelColor(topChannel.name) }} />
          </div>
          <div className="min-w-0">
            <p className="text-[2.4rem] font-semibold leading-[1.05] tracking-tight">
              {topChannel.name}
            </p>
            <p className="mt-1.5 text-[16px] font-medium text-foreground/55">
              {topChannel.pct}% av alla besök
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex h-[4.5rem] items-center pt-6">
          <Dash />
        </div>
      ),
    },
    {
      l: "Leads",
      d: sign(d.leadsDelta),
      p: (d.leadsDelta ?? null) !== null && d.leadsDelta! > 0,
      tip: { title: "Vad räknas som ett lead?", body: "Varje registrerad konvertering — t.ex. ifyllt kontaktformulär, telefonklick eller köp.", example: "Kräver att konverteringsspårning är aktiverat i Google Analytics." },
      body: noLeads ? (
        // Dash and note travel together as one bottom-anchored block: the note
        // is part of the value, not a caption hung off the card.
        <div className="mt-auto flex flex-col gap-4 pt-6">
          <Dash />
          <p className="max-w-[38ch] text-[16px] font-medium leading-[1.5] text-foreground/60">
            Du har inte konverteringsspårning på. Sätt på det för att mäta hur många affärer som
            konverteras.
          </p>
        </div>
      ) : (
        <p className={`mt-auto pt-6 ${STAT}`}>
          <NumberTicker value={d.leads} format={fmtNum} />
        </p>
      ),
    },
  ];
  return (
    // h-full + flex-1 on the grid: the card area claims all height left by the
    // heading, so the slide fills the canvas instead of centring a fixed-height
    // block and leaving a dead band underneath.
    <div ref={ref} className="flex h-full flex-col gap-8">
      <motion.div {...fadeUp(active, reduced)}>
        <SlideHeading sub="Så ser perioden ut i siffror — jämfört med föregående månad.">
          Snabb överblick
        </SlideHeading>
      </motion.div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 sm:gap-6">
        {kpis.map((k, i) => (
          <motion.div
            key={k.l}
            // overflow-hidden is a guard, not a layout tool: a card whose value
            // zone grows (the leads note) must clip at its own border rather
            // than spill onto the slide. Tooltips portal out, so nothing real
            // gets cut.
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-background/85 p-6 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(15,23,42,0.22)] sm:p-8"
            {...fadeUp(active, reduced, { y: 16, delay: 0.25 + i * 0.13 })}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[20px] font-semibold sm:text-[22px]">{k.l}</p>
                <InfoTooltip title={k.tip.title} body={k.tip.body} example={k.tip.example} side="above" />
              </div>
              <TrendPill delta={k.d} positive={k.p} size="md" />
            </div>
            {k.body}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
