"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Globe, Palette, Sparkles, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { ClientsResponse } from "@/lib/clients/types";

const EASING = [0.16, 1, 0.3, 1] as const;

// `soon` sections are not built yet. They say so plainly instead of showing
// controls that save nothing or states (a verified domain) that aren't true.
const sections = [
  { id: "profile", label: "Profil",         icon: User },
  { id: "brand",   label: "White-label",    icon: Palette,  soon: "Din logga och accentfärg på rapporterna du skickar till kunder." },
  { id: "domain",  label: "Eget domännamn", icon: Globe,    soon: "Rapporter på en adress som rapporter.dinbyra.se." },
  { id: "ai",      label: "AI-insikter",    icon: Sparkles, soon: "Välj ton och djup för sammanfattningarna Clarix skriver." },
] as const;

type SectionId = (typeof sections)[number]["id"];

type Profile = { name: string | null; email: string | null; workspace: string | null };

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);

  // Name and email come from the sign-in account (same source as the sidebar);
  // the workspace is the active client from /api/clients.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data }, clients] = await Promise.all([
        createClient().auth.getUser(),
        fetch("/api/clients", { cache: "no-store" })
          .then((r) => (r.ok ? (r.json() as Promise<ClientsResponse>) : null))
          .catch(() => null),
      ]);
      if (cancelled) return;
      const user = data?.user;
      const meta = user?.user_metadata ?? {};
      setProfile({
        name:
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          null,
        email: user?.email ?? null,
        workspace: clients?.clients.find((c) => c.isActive)?.name ?? null,
      });
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const section = sections.find((s) => s.id === active)!;

  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      <header
        className="sticky top-0 z-30 flex min-h-[88px] shrink-0 items-center border-b py-3 pl-16 pr-4 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)" }}
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

      <main className="flex-1 max-w-4xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
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
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--surface-tint)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--hover-surface)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{s.label}</span>
                  {"soon" in s && <SoonTag />}
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
            className="surface-card p-5 sm:p-6 lg:p-8"
          >
            {active === "profile" && (
              <div className="space-y-6">
                <SectionTitle title="Profil" help="Namn och e-post kommer från kontot du loggar in med." />

                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
                    style={{ background: "var(--brand-gradient)" }}
                    aria-hidden
                  >
                    {profile ? (profile.name ?? profile.email ?? "?").charAt(0).toUpperCase() : ""}
                  </div>
                  <div className="min-w-0">
                    {profile ? (
                      <>
                        <p className="truncate" style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {profile.name ?? profile.email ?? "Ditt konto"}
                        </p>
                        {profile.name && profile.email && (
                          <p className="truncate" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{profile.email}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="skeleton h-4 w-36" />
                        <div className="skeleton mt-2 h-3 w-48" />
                      </>
                    )}
                  </div>
                </div>

                <dl className="divide-y rounded-xl border" style={{ borderColor: "var(--line)" }}>
                  <ProfileRow label="Namn" value={profile ? profile.name : undefined} />
                  <ProfileRow label="E-post" value={profile ? profile.email : undefined} />
                  <ProfileRow
                    label="Aktiv arbetsyta"
                    value={profile ? profile.workspace : undefined}
                    action={<Link href="/clients" className="btn btn-ghost btn-sm -my-1 -mr-2">Kunder</Link>}
                  />
                </dl>
              </div>
            )}

            {"soon" in section && (
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                    {section.label}
                  </p>
                  <SoonTag />
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px", maxWidth: "48ch", lineHeight: 1.55 }}>
                  {section.soon}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ title, help }: { title: string; help: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{title}</p>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "3px" }}>{help}</p>
    </div>
  );
}

// value: undefined while loading, null when the account has none.
function ProfileRow({ label, value, action }: { label: string; value: string | null | undefined; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3" style={{ borderColor: "var(--line)" }}>
      <dt style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{label}</dt>
      <dd className="flex min-w-0 items-center gap-3">
        {value === undefined ? (
          <span className="skeleton inline-block h-3.5 w-32" aria-hidden />
        ) : (
          <span className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: value ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {value ?? "Inte angivet"}
          </span>
        )}
        {action}
      </dd>
    </div>
  );
}

function SoonTag() {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5"
      style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", backgroundColor: "var(--insight-surface)", color: "var(--insight-accent)" }}
    >
      Snart
    </span>
  );
}
