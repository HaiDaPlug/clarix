"use client";

import { motion } from "motion/react";
import { ArrowUpRight, FileText, MoreHorizontal, Plus } from "lucide-react";

const EASING = [0.16, 1, 0.3, 1] as const;

const clients = [
  { id: "1", name: "Lindqvist Juridik", domain: "lindqvistjuridik.se", reports: 12, status: "Aktiv", color: "from-violet-400 to-purple-500" },
  { id: "2", name: "Aurora Studios", domain: "aurora.studio", reports: 8, status: "Aktiv", color: "from-sky-400 to-blue-500" },
  { id: "3", name: "Halo Commerce", domain: "halocommerce.se", reports: 5, status: "Aktiv", color: "from-emerald-400 to-teal-500" },
  { id: "4", name: "Bergström & Co", domain: "bergstromco.se", reports: 3, status: "Inaktiv", color: "from-orange-400 to-amber-500" },
];

export default function ClientsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      <header
        className="flex items-center justify-between px-8 border-b shrink-0 sticky top-0 z-30"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)", height: "88px" }}
      >
        <div>
          <p className="eyebrow" style={{ color: "var(--slate)" }}>Arbetsytor</p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "var(--charcoal)",
              letterSpacing: "-0.02em",
              marginTop: "2px",
            }}
          >
            Kunder
          </h1>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
        >
          <Plus className="h-4 w-4" />
          Ny kund
        </button>
      </header>

      <main className="flex-1 px-8 py-8">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASING }}
          style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "24px" }}
        >
          {clients.length} kunder · {clients.reduce((s, c) => s + c.reports, 0)} levererade rapporter
        </motion.p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: EASING }}
              className="group relative overflow-hidden rounded-2xl p-6"
              style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
            >
              {/* subtle gradient glow */}
              <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${c.color} opacity-20 blur-2xl transition-opacity group-hover:opacity-35`} />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-lg font-bold text-white`}>
                    {c.name.charAt(0)}
                  </div>
                  <button
                    className="rounded-full p-1.5 transition-colors hover:bg-[var(--bone-dark)]"
                    style={{ color: "var(--slate)" }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                <h3
                  className="mt-4"
                  style={{ fontSize: "15px", fontWeight: 600, color: "var(--charcoal)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                >
                  {c.name}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--slate)", marginTop: "2px" }}>{c.domain}</p>

                <div
                  className="mt-4 flex items-center justify-between pt-4"
                  style={{ borderTop: "1px solid var(--rule)" }}
                >
                  <div className="flex items-center gap-1.5" style={{ fontSize: "12px", color: "var(--slate)" }}>
                    <FileText className="h-3.5 w-3.5" />
                    {c.reports} rapporter
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={
                      c.status === "Aktiv"
                        ? { background: "var(--signal-up-bg)", color: "var(--signal-up)", fontSize: "10px", fontWeight: 600 }
                        : { background: "var(--bone-dark)", color: "var(--slate)", fontSize: "10px", fontWeight: 500 }
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {c.status}
                  </span>
                </div>

                <button
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)]"
                  style={{ border: "1px solid var(--rule)", color: "var(--charcoal)" }}
                >
                  Öppna arbetsyta
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}

          {/* Add new card */}
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: clients.length * 0.06, ease: EASING }}
            className="flex min-h-[14rem] items-center justify-center rounded-2xl transition-colors hover:bg-[var(--bone)]"
            style={{ border: "1px dashed var(--rule)", color: "var(--slate)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-5 w-5" />
              <span style={{ fontSize: "13px", fontWeight: 500 }}>Lägg till ny kund</span>
            </div>
          </motion.button>
        </div>
      </main>
    </div>
  );
}
