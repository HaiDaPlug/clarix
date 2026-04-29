"use client";

import { motion } from "motion/react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Sparkles, TrendingUp, Calendar, Lightbulb, AlertTriangle, Trophy, Info, Download } from "lucide-react";
import { AppShell2 } from "@/components/layout2/app-shell2";
import { KpiCard2 } from "@/components/layout2/kpi-card2";
import {
  channelBreakdown, formatCurrency, formatNumber,
  insights, kpis, topPages, trafficTrend,
} from "@/lib/demo-data2";

const insightIcons = { win: Trophy, opportunity: Lightbulb, warning: AlertTriangle, info: Info };
const insightStyles: Record<string, string> = {
  win:         "bg-[oklch(0.7_0.16_155/0.1)] text-[oklch(0.7_0.16_155)]",
  opportunity: "bg-[oklch(0.65_0.19_265/0.1)] text-[oklch(0.65_0.19_265)]",
  warning:     "bg-[oklch(0.78_0.16_75/0.2)] text-[oklch(0.55_0.14_75)]",
  info:        "bg-muted text-muted-foreground",
};

export default function Dashboard2Page() {
  return (
    <AppShell2>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Aurora Studios</p>
            <h1 className="font-display2 mt-2 text-5xl tracking-tight">God morgon, Alex</h1>
            <p className="mt-2 text-sm text-muted-foreground">Så här har det rört sig de senaste 30 dagarna.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-muted">
              <Calendar className="h-4 w-4" />
              Senaste 30 dagarna
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
              <Download className="h-4 w-4" />
              Exportera
            </button>
          </div>
        </motion.div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard2 label="Sessioner"     value={kpis.sessions.value}    delta={kpis.sessions.delta}    spark={kpis.sessions.spark}    format={formatNumber}   accent="var(--chart-1)" delay={0.05} />
          <KpiCard2 label="Användare"     value={kpis.users.value}       delta={kpis.users.delta}       spark={kpis.users.spark}       format={formatNumber}   accent="var(--chart-2)" delay={0.1} />
          <KpiCard2 label="Konverteringar" value={kpis.conversions.value} delta={kpis.conversions.delta} spark={kpis.conversions.spark} format={formatNumber}   accent="var(--chart-3)" delay={0.15} />
          <KpiCard2 label="Intäkter"      value={kpis.revenue.value}     delta={kpis.revenue.delta}     spark={kpis.revenue.spark}     format={formatCurrency} accent="var(--chart-4)" delay={0.2} />
          <KpiCard2 label="Annonskostnad" value={kpis.adSpend.value}     delta={kpis.adSpend.delta}     spark={kpis.adSpend.spark}     format={formatCurrency} accent="var(--chart-5)" delay={0.25} />
          <KpiCard2 label="ROAS"          value={kpis.roas.value}        delta={kpis.roas.delta}        spark={kpis.roas.spark}        format={(n) => n.toFixed(2).replace(".", ",") + "×"} accent="var(--chart-1)" delay={0.3} />
        </div>

        {/* AI summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="relative overflow-hidden rounded-3xl border border-white/40 p-8 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)] sm:p-10 dark:border-white/10"
          style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 300) 0%, oklch(0.96 0.05 260) 45%, oklch(0.97 0.04 350) 100%)" }}
        >
          <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.85 0.16 300 / 0.55), transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.86 0.14 220 / 0.5), transparent 70%)" }} />
          <div className="pointer-events-none absolute right-1/3 top-10 h-40 w-40 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.88 0.12 350 / 0.5), transparent 70%)" }} />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_30px_-8px_rgba(139,92,246,0.7)]"
              style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 295), oklch(0.65 0.2 255))" }}
            >
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "oklch(0.45 0.18 290)" }}>
                  AI-sammanfattning
                </p>
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "oklch(0.62 0.22 295)" }} />
              </div>
              <p className="mt-4 text-2xl font-medium leading-[1.4] tracking-[-0.01em] sm:text-[1.7rem]" style={{ color: "oklch(0.18 0.02 280)" }}>
                Intäkterna växte{" "}
                <span className="font-semibold" style={{ color: "var(--c2-success)" }}>+18,6 %</span> till{" "}
                <span className="font-semibold">1,85 mn kr</span>. Snittordervärdet ökade{" "}
                <span className="font-semibold" style={{ color: "var(--c2-success)" }}>+4,2 %</span>. Aurora Pro driver
                fortsatt störst andel av försäljningen.
              </p>
            </div>
            <button className="self-start whitespace-nowrap rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-white sm:self-center" style={{ color: "oklch(0.35 0.15 290)" }}>
              Se uppdelning
            </button>
          </div>
        </motion.div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl border border-border/60 bg-gradient-card2 p-6 shadow-soft2 lg:col-span-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display2 text-2xl">Trafiktrend</h2>
                <p className="text-sm text-muted-foreground">Sessioner mot användare — senaste 12 veckorna</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-1)" }} />Sessioner
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "var(--chart-2)" }} />Användare
                </span>
              </div>
            </div>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="d2g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="d2g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="sessions" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#d2g1)" />
                  <Area type="monotone" dataKey="users"    stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#d2g2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="rounded-2xl border border-border/60 bg-gradient-card2 p-6 shadow-soft2"
          >
            <h2 className="font-display2 text-2xl">Kanaler</h2>
            <p className="text-sm text-muted-foreground">Trafikfördelning denna månad</p>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelBreakdown} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                    {channelBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2">
              {channelBreakdown.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </div>
                  <span className="font-medium tabular-nums">{c.value} %</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="rounded-2xl border border-border/60 bg-gradient-card2 p-6 shadow-soft2 lg:col-span-2"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display2 text-2xl">Mest besökta sidor</h2>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPages} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="path" type="category" stroke="var(--muted-foreground)" fontSize={11} width={170} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="views" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="rounded-2xl border border-border/60 bg-gradient-card2 p-6 shadow-soft2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "var(--c2-accent)" }} />
              <h2 className="font-display2 text-2xl">Rekommendationer</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {insights.map((ins) => {
                const Icon = insightIcons[ins.type as keyof typeof insightIcons];
                return (
                  <li key={ins.title} className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${insightStyles[ins.type]}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-snug">{ins.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ins.body}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </div>
    </AppShell2>
  );
}
