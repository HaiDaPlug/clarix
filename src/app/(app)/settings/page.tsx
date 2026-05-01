"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Check, Globe, Palette, Sparkles, Upload, User } from "lucide-react";

const EASING = [0.16, 1, 0.3, 1] as const;

const sections = [
  { id: "profile", label: "Profil",         icon: User },
  { id: "brand",   label: "White-label",    icon: Palette },
  { id: "domain",  label: "Eget domännamn", icon: Globe },
  { id: "ai",      label: "AI-insikter",    icon: Sparkles },
] as const;

type SectionId = (typeof sections)[number]["id"];

const accentColors = [
  "#E8524A",
  "#8B5CF6",
  "#F5A623",
  "#2D6A4F",
  "#0EA5E9",
  "#1A1916",
];

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>("profile");
  const [accent, setAccent] = useState(accentColors[0]);

  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      <header
        className="flex items-center px-8 border-b shrink-0 sticky top-0 z-30"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)", height: "88px" }}
      >
        <div>
          <p className="eyebrow" style={{ color: "var(--slate)" }}>Konto</p>
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
            Inställningar
          </h1>
        </div>
      </header>

      <main className="flex-1 px-8 py-8 max-w-4xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
          {/* Sidebar nav */}
          <nav className="flex flex-col gap-0.5">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left"
                  style={{
                    backgroundColor: isActive ? "var(--bone-dark)" : "transparent",
                    color: isActive ? "var(--charcoal)" : "var(--slate)",
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Content panel */}
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASING }}
            className="rounded-2xl p-6 lg:p-8"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            {active === "profile" && (
              <div className="space-y-6">
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em" }}>Profil</p>
                  <p style={{ fontSize: "13px", color: "var(--slate)", marginTop: "3px" }}>Så här visas ditt konto.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #8B5CF6, #E8524A)" }}>
                    A
                  </div>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)]"
                    style={{ border: "1px solid var(--rule)", color: "var(--charcoal)" }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Ladda upp foto
                  </button>
                </div>
                <SettingsField label="Fullständigt namn" defaultValue="Alex Lindqvist" />
                <SettingsField label="E-post" defaultValue="alex@aurora.studio" type="email" />
                <SettingsField label="Arbetsyta" defaultValue="Aurora Byrå" />
              </div>
            )}

            {active === "brand" && (
              <div className="space-y-6">
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em" }}>White-label</p>
                  <p style={{ fontSize: "13px", color: "var(--slate)", marginTop: "3px" }}>Logo och färger. Rapporter ärver dem automatiskt.</p>
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "8px" }}>Logo</p>
                  <div
                    className="flex items-center gap-4 rounded-xl p-6"
                    style={{ border: "1px dashed var(--rule)", backgroundColor: "var(--parchment)" }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 295), oklch(0.65 0.19 265))" }}>
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--charcoal)" }}>Dra och släpp eller klicka</p>
                      <p style={{ fontSize: "11.5px", color: "var(--slate)", marginTop: "2px" }}>SVG, PNG · max 2 MB</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "10px" }}>Accentfärg</p>
                  <div className="flex flex-wrap gap-2">
                    {accentColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setAccent(color)}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105"
                        style={{
                          background: color,
                          boxShadow: accent === color ? `0 0 0 2px var(--parchment), 0 0 0 4px ${color}` : "none",
                        }}
                      >
                        {accent === color && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <SettingsField label="Varumärkesnamn på rapporter" defaultValue="Aurora Studios Rapporter" />
              </div>
            )}

            {active === "domain" && (
              <div className="space-y-6">
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em" }}>Eget domännamn</p>
                  <p style={{ fontSize: "13px", color: "var(--slate)", marginTop: "3px" }}>Visa kundernas dashboards på din egen domän.</p>
                </div>
                <SettingsField label="Domän" defaultValue="rapporter.aurora.studio" placeholder="rapporter.dinbyra.se" />
                <div className="rounded-xl p-4" style={{ border: "1px solid var(--rule)", backgroundColor: "var(--parchment)" }}>
                  <p style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--slate-light)" }}>DNS-konfiguration</p>
                  <div className="mt-3 space-y-2 font-mono">
                    <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bone-dark)" }}>
                      <span style={{ fontSize: "12px", color: "var(--charcoal)" }}>CNAME · rapporter</span>
                      <span style={{ fontSize: "12px", color: "var(--slate)" }}>cname.clarix.se</span>
                    </div>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1.5" style={{ fontSize: "12px", color: "var(--signal-up)" }}>
                    <Check className="h-3 w-3" />
                    Verifierad · SSL aktivt
                  </p>
                </div>
              </div>
            )}

            {active === "ai" && (
              <div className="space-y-6">
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em" }}>AI-insikter</p>
                  <p style={{ fontSize: "13px", color: "var(--slate)", marginTop: "3px" }}>Justera ton och djup på genererade sammanfattningar.</p>
                </div>
                <SettingsToggle label="Generera slide-sammanfattningar automatiskt" defaultChecked />
                <SettingsToggle label="Visa rekommendationer på dashboarden" defaultChecked />
                <SettingsToggle label="Mejla veckosammanfattning av möjligheter" />
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "8px" }}>Tonläge</p>
                  <div className="flex flex-wrap gap-2">
                    {["Kortfattat", "Personligt", "Ledningsgrupp", "Tekniskt"].map((tone, i) => (
                      <button
                        key={tone}
                        className="rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors"
                        style={
                          i === 0
                            ? { backgroundColor: "var(--charcoal)", color: "var(--parchment)" }
                            : { border: "1px solid var(--rule)", color: "var(--slate)", backgroundColor: "transparent" }
                        }
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div
              className="mt-8 flex justify-end gap-2 pt-6"
              style={{ borderTop: "1px solid var(--rule)" }}
            >
              <button
                className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)]"
                style={{ border: "1px solid var(--rule)", color: "var(--charcoal)" }}
              >
                Avbryt
              </button>
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
              >
                Spara ändringar
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function SettingsField({ label, defaultValue, placeholder, type = "text" }: {
  label: string; defaultValue?: string; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "6px" }}>{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
        style={{ border: "1px solid var(--rule)", backgroundColor: "var(--parchment)", color: "var(--charcoal)" }}
      />
    </div>
  );
}

function SettingsToggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-[var(--bone-dark)]"
      style={{ border: "1px solid var(--rule)" }}
    >
      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--charcoal)" }}>{label}</span>
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
        style={{ background: on ? "var(--charcoal)" : "var(--rule)" }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
          style={{ transform: on ? "translateX(1rem)" : "translateX(0.125rem)" }}
        />
      </span>
    </button>
  );
}
