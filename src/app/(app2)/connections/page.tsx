"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Check, ChevronDown, Loader2, Lock, Mail,
  Plus, Search, Send, ShieldCheck, Sparkles, UserPlus, X,
} from "lucide-react";
import { AppShell2 } from "@/components/layout2/app-shell2";
import { integrations as initialIntegrations } from "@/lib/demo-data2";
import {
  GoogleAnalyticsLogo, GoogleSearchConsoleLogo, GoogleAdsLogo,
  MetaLogo, LinkedInLogo, TikTokLogo, ShopifyLogo, YouTubeLogo,
} from "@/components/landing/brand-logos";

type BaseIntegration = (typeof initialIntegrations)[number];
type Integration = BaseIntegration & { invitedBy?: string };
type FlowStep = "consent" | "choosing" | "connecting" | "done" | "invite" | "invite-sent";
type InvitePayload = { name: string; email: string; company: string; channel: string };

const RECOMMENDED_ORDER = ["ga4", "gads", "gsc", "meta"];

const LOGO_MAP: Record<string, (p: { className?: string }) => React.ReactElement> = {
  ga4: GoogleAnalyticsLogo,
  gsc: GoogleSearchConsoleLogo,
  gads: GoogleAdsLogo,
  meta: MetaLogo,
  linkedin: LinkedInLogo,
  tiktok: TikTokLogo,
  shopify: ShopifyLogo,
  youtube: YouTubeLogo,
};

function BrandMark({ integ, size = 44 }: { integ: Integration; size?: number }) {
  const Logo = LOGO_MAP[integ.id];
  if (Logo) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-white shadow-soft2"
        style={{ width: size, height: size }}
      >
        <Logo className="h-[58%] w-[58%]" />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl text-white shadow-soft2"
      style={{ width: size, height: size, background: integ.color }}
    >
      <span className="text-base font-bold">{integ.name.charAt(0)}</span>
    </div>
  );
}

export default function ConnectionsPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Integration[]>(initialIntegrations as Integration[]);
  const [active, setActive] = useState<Integration | null>(null);
  const [smartHintShown, setSmartHintShown] = useState(false);
  const [smartTarget, setSmartTarget] = useState<Integration | null>(null);

  const recommended = useMemo(
    () => RECOMMENDED_ORDER.map((id) => items.find((i) => i.id === id)).filter(Boolean) as Integration[],
    [items],
  );

  const others = useMemo(
    () =>
      items
        .filter((i) => !RECOMMENDED_ORDER.includes(i.id))
        .filter((i) => i.name.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  const recommendedFiltered = recommended.filter((i) =>
    i.name.toLowerCase().includes(query.toLowerCase()),
  );

  const connectedCount = items.filter((i) => i.connected).length;

  function maybeShowSmartHint(updated: Integration) {
    if (updated.id !== "ga4") return;
    const related = items.filter(
      (i) => i.provider === "Google" && i.id !== "ga4" && !i.connected && ["gads", "gsc"].includes(i.id),
    );
    if (related.length > 0) {
      setSmartTarget(updated);
      setSmartHintShown(true);
    }
  }

  function connectAllGoogle() {
    setItems((prev) =>
      prev.map((p) =>
        p.provider === "Google" && ["gads", "gsc"].includes(p.id)
          ? { ...p, connected: true, account: smartTarget?.account || p.account }
          : p,
      ),
    );
    setSmartHintShown(false);
  }

  return (
    <AppShell2>
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 lg:px-8 lg:py-12">

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-card2 px-6 py-10 shadow-soft2 sm:px-12 sm:py-14"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "var(--c2-accent)", opacity: 0.06 }} />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full opacity-5 blur-3xl" style={{ background: "oklch(0.62 0.22 295)" }} />

          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--c2-accent)" }} />
                Anslutningar
              </span>
              <h1 className="font-display2 mt-5 text-[2.75rem] leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
                Koppla dina viktigaste kanaler
                <br />
                <span className="font-accent italic" style={{ background: "linear-gradient(to right, oklch(0.65 0.21 330), oklch(0.62 0.22 295), oklch(0.65 0.19 265))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  på 2 minuter.
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-foreground/80">
                Hämta in statistik automatiskt från dina viktigaste plattformar.
                Ingen teknisk kunskap krävs — vi sköter behörigheter, synk och uppdateringar.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { const next = items.find((i) => !i.connected); if (next) setActive(next); }}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-[15px] font-semibold text-background shadow-elevated2 transition-all hover:-translate-y-0.5 hover:opacity-95"
                >
                  Koppla första kanalen
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-7 py-3.5 text-[15px] font-semibold text-foreground backdrop-blur transition-all hover:bg-muted">
                  Se exempelrapport
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-7 flex items-center gap-2 text-sm font-medium text-foreground/75">
                <ShieldCheck className="h-4 w-4" style={{ color: "var(--c2-success)" }} />
                Clarix läser endast statistik. Vi publicerar aldrig innehåll.
              </div>
            </div>

            {/* Logo cluster */}
            <div className="relative hidden h-32 w-72 lg:block">
              {[GoogleAnalyticsLogo, GoogleAdsLogo, GoogleSearchConsoleLogo, MetaLogo, ShopifyLogo].map((Logo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className="absolute flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-white shadow-elevated2"
                  style={{ left: `${i * 56}px`, top: `${(i % 2) * 14}px` }}
                >
                  <Logo className="h-7 w-7" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Smart Google hint */}
        <AnimatePresence>
          {smartHintShown && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: "oklch(0.62 0.22 295 / 0.3)", background: "oklch(0.62 0.22 295 / 0.05)" }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-soft2">
                  <Sparkles className="h-5 w-5" style={{ color: "var(--c2-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Vi hittade även Google Ads och Search Console på samma konto</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Spara tid — koppla alla tre tjänster i ett svep.</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setSmartHintShown(false)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted"
                >
                  Välj manuellt
                </button>
                <button
                  onClick={connectAllGoogle}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-soft2 hover:opacity-90"
                >
                  <Check className="h-3.5 w-3.5" />
                  Koppla allt med ett klick
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <div className="rounded-2xl border border-border/60 bg-gradient-card2 p-6 shadow-soft2 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "oklch(0.62 0.22 295 / 0.1)" }}>
                <Sparkles className="h-5 w-5" style={{ color: "var(--c2-accent)" }} />
              </div>
              <div>
                <p className="text-base font-semibold">{connectedCount} av {items.length} kanaler kopplade.</p>
                <p className="mt-0.5 text-sm text-foreground/70">
                  {connectedCount < items.length
                    ? `Koppla ${Math.min(1, items.length - connectedCount)} till för bättre AI-insikter.`
                    : "Alla kanaler är kopplade — full insikt aktiverad."}
                </p>
              </div>
            </div>
            <span className="text-base font-bold">{Math.round((connectedCount / items.length) * 100)}%</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(connectedCount / items.length) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(to right, oklch(0.65 0.21 330), oklch(0.62 0.22 295), oklch(0.65 0.19 265))" }}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök bland integrationer…"
            className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Recommended */}
        {recommendedFiltered.length > 0 && (
          <section>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: "oklch(0.62 0.22 295 / 0.1)", color: "var(--c2-accent)" }}>
                  <Sparkles className="h-3 w-3" />
                  Börja här
                </span>
                <h2 className="font-display2 mt-3 text-3xl tracking-tight">Rekommenderade kanaler</h2>
                <p className="mt-1.5 max-w-xl text-base text-foreground/70">
                  Dessa fyra täcker 90 % av dina insikter. Koppla dem först — resten kan vänta.
                </p>
              </div>
              <span className="hidden shrink-0 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-foreground/70 sm:inline-flex">
                {recommendedFiltered.filter((i) => i.connected).length}/{recommendedFiltered.length} kopplade
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {recommendedFiltered.map((integ, i) => (
                <ChannelCard key={integ.id} integ={integ} index={i} featured onOpen={() => setActive(integ)} />
              ))}
            </div>
          </section>
        )}

        {/* Others */}
        {others.length > 0 && (
          <section>
            <div className="mb-6">
              <h2 className="font-display2 text-2xl tracking-tight">Fler kanaler</h2>
              <p className="mt-1.5 text-base text-foreground/70">Lägg till sociala medier, e-handel och egna datakällor.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((integ, i) => (
                <ChannelCard key={integ.id} integ={integ} index={i} onOpen={() => setActive(integ)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {active && (
          <ConnectModal
            integration={active}
            onClose={() => setActive(null)}
            onConnect={(updated) => {
              setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              setActive(null);
              maybeShowSmartHint(updated);
            }}
            onDisconnect={(id) => {
              setItems((prev) =>
                prev.map((p) => (p.id === id ? { ...p, connected: false, account: "" } : p)),
              );
            }}
          />
        )}
      </AnimatePresence>
    </AppShell2>
  );
}

/* ─── ChannelCard ─── */

function ChannelCard({
  integ, index, featured, onOpen,
}: {
  integ: Integration; index: number; featured?: boolean; onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-card2 shadow-soft2 transition-all hover:-translate-y-1 hover:border-foreground/20 hover:shadow-elevated2 ${
        featured ? "min-h-[296px] border-border/80 p-8" : "min-h-[268px] border-border/60 p-7"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100" style={{ background: `linear-gradient(to right, transparent, oklch(0.62 0.22 295 / 0.4), transparent)` }} />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <BrandMark integ={integ} size={featured ? 64 : 56} />
          <div className="min-w-0">
            <h3 className={`font-semibold tracking-tight ${featured ? "text-2xl" : "text-xl"}`}>{integ.name}</h3>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/55">{integ.category}</p>
          </div>
        </div>
        {integ.connected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.7 0.16 155 / 0.1)", color: "var(--c2-success)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--c2-success)" }} />
            Ansluten
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground/65">Ej ansluten</span>
        )}
      </div>

      <p className="mt-6 line-clamp-2 text-[15px] leading-relaxed text-foreground/80">{integ.purpose}</p>
      {integ.connected && integ.account && (
        <p className="mt-3 truncate text-xs font-semibold text-foreground/65">{integ.account}</p>
      )}
      {integ.connected && integ.invitedBy && (
        <p className="mt-1 inline-flex items-center gap-1 truncate text-[11px] font-medium" style={{ color: "var(--c2-accent)" }}>
          <UserPlus className="h-3 w-3" />
          Ansluten av {integ.invitedBy}
        </p>
      )}

      <button
        onClick={onOpen}
        className={`mt-7 inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3 text-[15px] font-semibold transition-all ${
          integ.connected
            ? "border border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted"
            : "bg-foreground text-background shadow-elevated2 hover:-translate-y-0.5 hover:opacity-95"
        }`}
      >
        {integ.connected ? (
          <><span>Hantera</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
        ) : (
          <><Plus className="h-4 w-4" /><span>Anslut nu</span></>
        )}
      </button>
    </motion.div>
  );
}

/* ─── ConnectModal ─── */

function ConnectModal({
  integration, onClose, onConnect, onDisconnect,
}: {
  integration: Integration;
  onClose: () => void;
  onConnect: (i: Integration) => void;
  onDisconnect: (id: string) => void;
}) {
  const [step, setStep] = useState<FlowStep>(integration.connected ? "done" : "consent");
  const [accepted, setAccepted] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(integration.scopes.map((s) => [s, true])),
  );
  const [chosenAccount, setChosenAccount] = useState<string>(
    integration.account || sampleAccountsFor(integration)[0].email,
  );

  useEffect(() => {
    if (step !== "connecting") return;
    const t = setTimeout(() => {
      onConnect({ ...integration, connected: true, account: chosenAccount });
    }, 1400);
    return () => clearTimeout(t);
  }, [step, integration, chosenAccount, onConnect]);

  const allAccepted = integration.scopes.every((s) => accepted[s]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-elevated2"
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{providerHost(integration.provider)}</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Stäng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3">
            <BrandMark integ={integration} size={44} />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{integration.provider}</p>
              <p className="text-sm font-semibold">{integration.name}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "consent" && (
              <motion.div key="consent" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mt-6">
                <h2 className="font-display2 text-2xl leading-tight">Välj ett {integration.provider}-konto</h2>
                <p className="mt-1 text-sm text-muted-foreground">för att fortsätta till <span className="font-medium text-foreground">Clarix</span></p>
                <div className="mt-5 space-y-1.5">
                  {sampleAccountsFor(integration).map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => { setChosenAccount(acc.email); setStep("choosing"); }}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-all hover:bg-muted"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white" style={{ background: acc.color }}>
                        {acc.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{acc.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{acc.email}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => { setChosenAccount("Annat konto"); setStep("choosing"); }}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-left text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><Plus className="h-4 w-4" /></div>
                    Använd ett annat konto
                  </button>
                </div>

                <button
                  onClick={() => setStep("invite")}
                  className="mt-3 flex w-full items-start gap-3 rounded-xl border border-border px-3.5 py-3 text-left transition-all hover:border-foreground/30"
                  style={{ background: "linear-gradient(to bottom right, oklch(0.62 0.22 295 / 0.06), transparent)" }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><UserPlus className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Skicka till extern person</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">Har din byrå, kollega eller konsult access? Skicka en säker länk.</p>
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>

                <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c2-success)" }} />
                  <p>Clarix läser endast statistik. Vi publicerar aldrig innehåll och kan inte ändra eller radera data.</p>
                </div>
              </motion.div>
            )}

            {step === "choosing" && (
              <motion.div key="choosing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mt-6">
                <h2 className="font-display2 text-2xl leading-tight">Clarix vill ha åtkomst till ditt {integration.provider}-konto</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{chosenAccount}</p>
                <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Det här tillåter Clarix att:</p>
                  <ul className="mt-3 space-y-2.5">
                    {integration.scopes.map((scope) => (
                      <li key={scope} className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setAccepted((prev) => ({ ...prev, [scope]: !prev[scope] }))}
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${accepted[scope] ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}
                        >
                          {accepted[scope] && <Check className="h-3 w-3" />}
                        </button>
                        <span className="text-sm leading-snug">{scope}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-background p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--c2-success)" }} />
                  <p>Clarix läser endast statistik. Du kan dra tillbaka åtkomsten när som helst.</p>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setStep("consent")} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Avbryt</button>
                  <button disabled={!allAccepted} onClick={() => setStep("connecting")} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Tillåt</button>
                </div>
              </motion.div>
            )}

            {step === "connecting" && (
              <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-10 flex flex-col items-center gap-4 py-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--c2-accent)" }} />
                <p className="font-medium">Säkrar anslutningen…</p>
                <p className="text-sm text-muted-foreground">Hämtar konton, dataströmmar och uppdateringstoken.</p>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "oklch(0.7 0.16 155 / 0.15)", color: "var(--c2-success)" }}>
                    <Check className="h-4 w-4" />
                  </div>
                  <h2 className="font-display2 text-2xl leading-tight">Ansluten</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Vi synkar nu data från {integration.name} i bakgrunden.</p>
                <div className="mt-5 space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  <Row label="Konto" value={chosenAccount} />
                  <Row label="Status" value={<span style={{ color: "var(--c2-success)" }}>Aktiv</span>} />
                  <Row label="Senast synkad" value="Just nu" />
                  <Row label="Behörigheter" value={<span className="text-muted-foreground">{integration.scopes.length} godkända</span>} />
                </div>
                <details className="mt-3 group">
                  <summary className="flex cursor-pointer items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm hover:bg-muted">
                    <span>Visa beviljade behörigheter</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="mt-2 space-y-1.5 px-3 text-xs text-muted-foreground">
                    {integration.scopes.map((s) => (
                      <li key={s} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--c2-success)" }} />
                        {s}
                      </li>
                    ))}
                  </ul>
                </details>
                <div className="mt-6 flex justify-between gap-2">
                  <button
                    onClick={() => { onDisconnect(integration.id); onClose(); }}
                    className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    Koppla ifrån
                  </button>
                  <button onClick={onClose} className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Klar</button>
                </div>
              </motion.div>
            )}

            {step === "invite" && (
              <InviteForm
                key="invite"
                integration={integration}
                onCancel={() => setStep("consent")}
                onSent={(invite) => {
                  onConnect({ ...integration, connected: true, account: invite.email, invitedBy: invite.name });
                  setStep("invite-sent");
                }}
              />
            )}

            {step === "invite-sent" && (
              <motion.div key="invite-sent" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-8 flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "oklch(0.7 0.16 155 / 0.15)", color: "var(--c2-success)" }}>
                  <Check className="h-5 w-5" />
                </div>
                <h2 className="font-display2 text-2xl leading-tight">Inbjudan skickad</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Mottagaren får en säker engångslänk att koppla {integration.name}. Du får en notis när det är klart.
                </p>
                <button onClick={onClose} className="mt-3 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">Klar</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── InviteForm ─── */

function InviteForm({
  integration, onCancel, onSent,
}: {
  integration: Integration;
  onCancel: () => void;
  onSent: (invite: InvitePayload) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [channel, setChannel] = useState(integration.name);
  const [busy, setBusy] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = name.trim().length >= 2 && emailValid && channel.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onSent({ name: name.trim(), email: email.trim().toLowerCase(), company: company.trim(), channel: channel.trim() });
    }, 900);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      onSubmit={handleSubmit} className="mt-6"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background"><UserPlus className="h-4 w-4" /></div>
        <h2 className="font-display2 text-2xl leading-tight">Skicka anslutningslänk</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Vi mejlar en säker engångslänk så att personen kan koppla {integration.name} åt dig.</p>
      <div className="mt-5 space-y-3">
        <FormField label="Namn"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="t.ex. Sara Bergström" className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-foreground focus:outline-none" /></FormField>
        <FormField label="E-post"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" maxLength={120} placeholder="sara@byran.se" className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-foreground focus:outline-none" /></FormField>
        <FormField label="Företag" hint="valfritt"><input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} placeholder="t.ex. Klarna Studio" className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-foreground focus:outline-none" /></FormField>
        <FormField label="Kanal att koppla"><input value={channel} onChange={(e) => setChannel(e.target.value)} maxLength={60} className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-foreground focus:outline-none" /></FormField>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
        <p>Länken är giltig i 7 dagar och kan endast användas en gång. Mottagaren behöver inget Clarix-konto.</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">Tillbaka</button>
        <button type="submit" disabled={!canSubmit || busy} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Skickar…</> : <><Send className="h-3.5 w-3.5" />Skicka anslutningslänk</>}
        </button>
      </div>
    </motion.form>
  );
}

/* ─── Helpers ─── */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium">{value}</span>
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground/80">
        {label}
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function providerHost(provider: string) {
  const map: Record<string, string> = {
    Google: "accounts.google.com",
    Meta: "facebook.com/dialog/oauth",
    LinkedIn: "linkedin.com/oauth",
    TikTok: "business-api.tiktok.com",
    Shopify: "shopify.com/admin/oauth",
    Clarix: "clarix.se",
  };
  return map[provider] ?? provider.toLowerCase() + ".com";
}

function sampleAccountsFor(i: Integration) {
  switch (i.provider) {
    case "Google":
      return [
        { name: "Alex Lindqvist", email: "alex@aurora.studio", color: "#7C3AED" },
        { name: "Aurora Studios", email: "data@aurora.studio", color: "#0EA5E9" },
      ];
    case "Meta":
      return [
        { name: "Aurora Studios · BM", email: "Business Manager · 184 932 451", color: "#0866FF" },
        { name: "Halo Commerce · BM", email: "Business Manager · 947 110 822", color: "#1877F2" },
      ];
    case "LinkedIn":
      return [{ name: "Alex Lindqvist", email: "alex@aurora.studio", color: "#0A66C2" }];
    case "TikTok":
      return [{ name: "Aurora Studios", email: "TikTok Business · 7234 8821", color: "#FF0050" }];
    case "Shopify":
      return [{ name: "Aurora Studios", email: "aurora-studios.myshopify.com", color: "#95BF47" }];
    default:
      return [{ name: "Standardkonto", email: "alex@aurora.studio", color: "#6B7280" }];
  }
}
