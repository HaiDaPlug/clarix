"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Compass, MousePointerClick, Sparkles, Target, TrendingUp } from "lucide-react";
import { GoogleAnalyticsLogo, GoogleAdsLogo, MetaLogo } from "@/components/landing/brand-logos";

export function Showcase({
  eyebrow,
  title,
  body,
  visual,
}: {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--c2-accent)" }}>
          {eyebrow}
        </p>
        <h2 className="font-display2 mx-auto mt-5 max-w-3xl text-[2.25rem] leading-[1.08] tracking-normal sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-[1.6] text-foreground/70 sm:mt-6 sm:text-lg">{body}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-10 max-w-5xl sm:mt-16"
      >
        <div className="pointer-events-none absolute -inset-4 -z-10 sm:-inset-12">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-brand opacity-12 blur-2xl sm:rounded-[3rem] sm:opacity-15 sm:blur-3xl" />
          <div className="absolute -bottom-8 left-1/4 h-28 w-1/2 rounded-full blur-2xl sm:-bottom-10 sm:h-40 sm:blur-3xl" style={{ background: `oklch(0.65 0.19 265 / 0.25)` }} />
        </div>
        {visual}
      </motion.div>
    </div>
  );
}

function VisualFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-gradient-card2 shadow-[0_34px_80px_-34px_rgba(15,23,42,0.45),0_16px_34px_-22px_rgba(15,23,42,0.3)] ring-1 ring-white/5 sm:rounded-2xl sm:shadow-[0_50px_120px_-30px_rgba(15,23,42,0.5),0_20px_40px_-20px_rgba(15,23,42,0.3)]">
      <div className="flex items-center gap-1.5 border-b border-border/40 bg-gradient-to-b from-muted/40 to-muted/20 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--c2-warning)" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--c2-success)" }} />
        <span className="ml-2 min-w-0 truncate text-[11px] font-medium tracking-normal text-muted-foreground sm:ml-3 sm:text-xs">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function DashboardKpiVisual() {
  const kpis = [
    { l: "Sessioner", v: "184k", d: "+14 %", icon: TrendingUp },
    { l: "Leads", v: "2 184", d: "+9 %", icon: MousePointerClick },
    { l: "Intäkter", v: "1,8 mn", d: "+18 %", icon: ArrowUpRight },
    { l: "ROAS", v: "4,37×", d: "+23 %", icon: Target },
  ];
  return (
    <VisualFrame label="clarix.se/oversikt">
      <div className="space-y-4 p-3 sm:space-y-5 sm:p-7">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-lg border border-border/60 bg-background/60 p-3 text-left sm:rounded-xl sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">{k.l}</p>
                <k.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
              <p className="font-numeric mt-2 text-2xl text-foreground sm:mt-3 sm:text-3xl">{k.v}</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: "var(--c2-success)" }}>{k.d}</p>
            </div>
          ))}
        </div>
        <div className="relative rounded-lg border border-border/60 bg-background/60 p-3 sm:rounded-xl sm:p-5">
          <div className="pointer-events-none absolute inset-x-6 bottom-2 h-12 rounded-full blur-2xl" style={{ background: `oklch(0.65 0.19 265 / 0.3)` }} />
          <div className="relative flex h-32 items-end gap-1 sm:h-44 sm:gap-1.5">
            {[35, 48, 42, 55, 60, 52, 68, 72, 70, 80, 86, 95, 90, 102, 115, 108, 122].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm sm:rounded-t-md"
                style={{ height: `${h}%`, background: `linear-gradient(to top, oklch(0.65 0.19 265 / 0.3), oklch(0.65 0.19 265))`, boxShadow: "0 0 20px -2px oklch(0.65 0.19 265 / 0.4)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </VisualFrame>
  );
}

export function AiInsightsVisual() {
  const insights = [
    { tone: "success" as const, title: "Trafiken växer organiskt", body: "Tre nya blogginlägg drev +14 % sessioner senaste veckan." },
    { tone: "accent" as const, title: "Skjut in budget på Meta", body: 'ROAS 5,2× på kampanj "Vår-sale" — höj dagsbudget med 30 %.' },
    { tone: "warning" as const, title: "Konvertering tappar mobilt", body: "Checkout-steg 2 har 18 % drop-off. Kolla formuläret på iOS." },
  ];
  const toneStyles: Record<string, string> = {
    success: `background: oklch(0.7 0.16 155 / 0.15); color: oklch(0.7 0.16 155)`,
    accent: `background: oklch(0.65 0.19 265 / 0.15); color: oklch(0.65 0.19 265)`,
    warning: `background: oklch(0.78 0.16 75 / 0.2); color: oklch(0.55 0.14 75)`,
  };
  return (
    <VisualFrame label="clarix.se/ai-insikter">
      <div className="space-y-3 p-3 sm:p-7">
        <div className="flex items-center gap-2 rounded-lg px-3 py-3 sm:px-4" style={{ background: `oklch(0.65 0.19 265 / 0.15)` }}>
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: "oklch(0.65 0.19 265)" }} />
          <p className="text-sm font-semibold">Veckans 3 viktigaste insikter</p>
        </div>
        {insights.map((it) => (
          <div key={it.title} className="rounded-xl border border-border/60 bg-background/60 p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-3.5">
              <span
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ cssText: toneStyles[it.tone] } as React.CSSProperties}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.95rem] font-semibold leading-snug text-foreground sm:text-base">{it.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{it.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </VisualFrame>
  );
}

export function SeoChannelsVisual() {
  const rows = [
    { name: "Organisk", sub: "Obetald trafik från Google", Logo: GoogleAnalyticsLogo, value: "6 241", delta: "+12 %", bar: 82 },
    { name: "Köpt trafik Google", sub: "Google Ads", Logo: GoogleAdsLogo, value: "4 890", delta: "+6 %", bar: 64 },
    { name: "Köpt trafik från Meta", sub: "Meta Ads", Logo: MetaLogo, value: "3 822", delta: "+21 %", bar: 56 },
    { name: "Direkt-trafik", sub: "Direkt till webbplatsen", Logo: null, value: "2 410", delta: "+3 %", bar: 38 },
  ];
  return (
    <VisualFrame label="clarix.se/kanaler">
      <div className="space-y-4 p-3 sm:space-y-5 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.95rem] font-semibold leading-snug sm:text-base">Trafik & konvertering per kanal</p>
          <span className="w-fit rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-xs text-muted-foreground">Senaste 30 dagar</span>
        </div>
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.name} className="rounded-xl border border-border/60 bg-background/60 p-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
                    {c.Logo ? <c.Logo className="h-5 w-5" /> : <Compass className="h-[18px] w-[18px] text-foreground/80" strokeWidth={1.75} />}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold leading-tight">{c.name}</span>
                    <span className="text-[11px] leading-tight text-muted-foreground">{c.sub}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 self-end sm:self-auto">
                  <span className="font-numeric text-lg text-foreground">{c.value}</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--c2-success)" }}>{c.delta}</span>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/60">
                <div
                  style={{ width: `${c.bar}%`, background: `linear-gradient(to right, oklch(0.65 0.19 265), oklch(0.65 0.19 265 / 0.6))`, boxShadow: "0 0 12px -1px oklch(0.65 0.19 265 / 0.5)" }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </VisualFrame>
  );
}
