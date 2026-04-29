"use client";

import { motion } from "motion/react";
import { ArrowUpRight, FileText, MoreHorizontal, Plus } from "lucide-react";
import { AppShell2 } from "@/components/layout2/app-shell2";
import { clients } from "@/lib/demo-data2";

export default function ClientsPage() {
  return (
    <AppShell2>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 lg:px-8 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Arbetsytor</p>
            <h1 className="font-display2 mt-2 text-5xl tracking-tight">Kunder</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {clients.length} kunder · {clients.reduce((s, c) => s + c.reports, 0)} levererade rapporter
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
            <Plus className="h-4 w-4" />
            Ny kund
          </button>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card2 p-6 shadow-soft2 transition-all hover:shadow-elevated2"
            >
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${c.color} opacity-30 blur-2xl transition-all group-hover:opacity-50`} />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-lg font-bold text-white shadow-soft2`}>
                    {c.name.charAt(0)}
                  </div>
                  <button className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{c.name}</h3>
                <p className="text-sm text-muted-foreground">{c.domain}</p>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {c.reports} rapporter
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={
                      c.status === "Aktiv"
                        ? { background: "oklch(0.7 0.16 155 / 0.1)", color: "var(--c2-success)" }
                        : { background: "oklch(0.78 0.16 75 / 0.15)", color: "oklch(0.55 0.14 75)" }
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {c.status}
                  </span>
                </div>

                <button className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-muted">
                  Öppna arbetsyta
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}

          <button className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-6 w-6" />
              Lägg till ny kund
            </div>
          </button>
        </div>
      </div>
    </AppShell2>
  );
}
