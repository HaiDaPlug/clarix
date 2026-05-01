"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale } from "@/lib/i18n";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ConnectableSource,
  ConnectedSource,
  GooglePropertiesResponse,
} from "@/lib/google/connected-sources";
import {
  GoogleAnalyticsLogo,
  GoogleSearchConsoleLogo,
  GoogleAdsLogo,
} from "@/components/landing/brand-logos";

const EASING = [0.16, 1, 0.3, 1] as const;

const INTEGRATION_IDS = ["ga4", "gsc", "google_ads"] as const;
type IntegrationId = (typeof INTEGRATION_IDS)[number];

type PropertyOption = { id: string; displayName: string };

const COPY = {
  sv: {
    loadingConnections: "Hämtar anslutningar...",
    loadingProperties: "Hämtar tillgängliga egendomar...",
    choose: "Välj vilken egendom som ska anslutas.",
    noProperties: "Inga tillgängliga egendomar hittades för detta Google-konto.",
    reconnect: "Logga in med Google igen",
    connectedTo: "Ansluten till",
    failedConnections: "Kunde inte hämta anslutna källor.",
    failedProperties: "Kunde inte hämta Google-egendomar.",
    failedConnect: "Kunde inte ansluta källan.",
    failedDisconnect: "Kunde inte koppla från källan.",
    refreshNeeded: "Anslutningen behöver förnyas.",
    refreshHelp: "Logga in med Google igen för att ge servern en ny refresh token.",
    connecting: "Ansluter...",
    disconnecting: "Kopplar från...",
  },
  en: {
    loadingConnections: "Loading connections...",
    loadingProperties: "Loading available properties...",
    choose: "Choose which property to connect.",
    noProperties: "No available properties were found for this Google account.",
    reconnect: "Sign in with Google again",
    connectedTo: "Connected to",
    failedConnections: "Could not load connected sources.",
    failedProperties: "Could not load Google properties.",
    failedConnect: "Could not connect this source.",
    failedDisconnect: "Could not disconnect this source.",
    refreshNeeded: "This connection needs to be refreshed.",
    refreshHelp: "Sign in with Google again so the server receives a new refresh token.",
    connecting: "Connecting...",
    disconnecting: "Disconnecting...",
  },
};

/* ─── Visual integration definitions ─── */

type VisualIntegration = {
  id: IntegrationId;
  name: string;
  category: string;
  purpose: string;
  available: boolean;
  unlocks: string[];
  color: string;
  Logo: ((p: { className?: string }) => React.ReactElement) | null;
};

const VISUAL_INTEGRATIONS: VisualIntegration[] = [
  {
    id: "ga4",
    name: "Google Analytics 4",
    category: "Webbanalys",
    purpose:
      "Hämtar besöksdata, trafikkällor, konverteringar och engagemangsmätningar direkt från din GA4-egendom.",
    available: true,
    unlocks: ["Sessioner", "Trafikkällor", "Konverteringar", "Bounce rate"],
    color: "#E37400",
    Logo: GoogleAnalyticsLogo,
  },
  {
    id: "gsc",
    name: "Google Search Console",
    category: "SEO-synlighet",
    purpose:
      "Hämtar klick, visningar, CTR och genomsnittlig position för organiska sökresultat.",
    available: true,
    unlocks: ["Klick", "Visningar", "CTR", "Genomsn. position", "Toppsökord"],
    color: "#4285F4",
    Logo: GoogleSearchConsoleLogo,
  },
  {
    id: "google_ads",
    name: "Google Ads",
    category: "Betald sökning",
    purpose: "Annonskostnad, ROAS och konverteringar från dina kampanjer.",
    available: false,
    unlocks: ["Annonskostnad", "ROAS", "CPC", "Annonskonverteringar"],
    color: "#FBBC04",
    Logo: GoogleAdsLogo,
  },
];

/* ─── BrandMark ─── */

function BrandMark({
  integ,
  size = 44,
}: {
  integ: VisualIntegration;
  size?: number;
}) {
  if (integ.Logo) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-white shadow-soft"
        style={{ width: size, height: size }}
      >
        <integ.Logo className="h-[58%] w-[58%]" />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl text-white shadow-soft"
      style={{ width: size, height: size, background: integ.color }}
    >
      <span className="text-base font-bold">{integ.name.charAt(0)}</span>
    </div>
  );
}

/* ─── Page ─── */

export default function IntegrationsPage() {
  const { locale, t } = useLocale();
  const copy = COPY[locale];

  const [connectedSources, setConnectedSources] = useState<
    Partial<Record<ConnectableSource, ConnectedSource>>
  >({});
  const [properties, setProperties] = useState<GooglePropertiesResponse>({
    ga4: [],
    gsc: [],
  });
  const [activeModal, setActiveModal] = useState<VisualIntegration | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [pendingSource, setPendingSource] = useState<ConnectableSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasMissingGoogleSource = !connectedSources.ga4 || !connectedSources.gsc;
  const connectedCount = INTEGRATION_IDS.filter((id) => {
    if (id === "ga4" || id === "gsc") return Boolean(connectedSources[id]);
    return false;
  }).length;
  const totalAvailable = VISUAL_INTEGRATIONS.filter((i) => i.available).length;

  useEffect(() => {
    let cancelled = false;
    async function loadConnections() {
      setLoadingConnections(true);
      setError(null);
      const response = await fetch("/api/google/connections", { cache: "no-store" });
      if (cancelled) return;
      if (!response.ok) {
        setError(copy.failedConnections);
        setLoadingConnections(false);
        return;
      }
      const payload = (await response.json()) as { sources?: ConnectedSource[] };
      const bySource = (payload.sources ?? []).reduce<
        Partial<Record<ConnectableSource, ConnectedSource>>
      >((acc, source) => {
        if (source.source === "ga4" || source.source === "gsc")
          acc[source.source as ConnectableSource] = source as ConnectedSource;
        return acc;
      }, {});
      setConnectedSources(bySource);
      setLoadingConnections(false);
    }
    loadConnections();
    return () => {
      cancelled = true;
    };
  }, [copy.failedConnections]);

  useEffect(() => {
    if (loadingConnections || !hasMissingGoogleSource) return;
    let cancelled = false;
    async function loadProperties() {
      setLoadingProperties(true);
      try {
        const response = await fetch("/api/google/properties", { cache: "no-store" });
        const payload = (await response.json()) as GooglePropertiesResponse;
        if (cancelled) return;
        setProperties(payload);
        if (payload.error) setError(payload.error.message);
      } catch {
        if (!cancelled) setError(copy.failedProperties);
      } finally {
        if (!cancelled) setLoadingProperties(false);
      }
    }
    loadProperties();
    return () => {
      cancelled = true;
    };
  }, [copy.failedProperties, hasMissingGoogleSource, loadingConnections]);

  const optionsBySource = useMemo(
    (): Record<ConnectableSource, PropertyOption[]> => ({
      ga4: properties.ga4.map((p) => ({ id: p.propertyId, displayName: p.displayName })),
      gsc: properties.gsc.map((s) => ({ id: s.siteUrl, displayName: s.displayName })),
    }),
    [properties],
  );

  async function connectSource(source: ConnectableSource, option: PropertyOption) {
    setPendingSource(source);
    setError(null);
    try {
      const response = await fetch("/api/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          propertyId: option.id,
          displayName: option.displayName,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? copy.failedConnect);
      }
      const payload = (await response.json()) as { needsRefresh?: boolean };
      setConnectedSources((current) => ({
        ...current,
        [source]: {
          id: `${source}:${option.id}`,
          source,
          property_id: option.id,
          display_name: option.displayName,
          token_expires_at: null,
          needs_refresh: payload.needsRefresh,
        },
      }));
      setActiveModal(null);
    } catch (connectError) {
      setError(
        connectError instanceof Error ? connectError.message : copy.failedConnect,
      );
    } finally {
      setPendingSource(null);
    }
  }

  async function disconnectSource(source: ConnectableSource) {
    setPendingSource(source);
    setError(null);
    try {
      const response = await fetch("/api/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!response.ok) throw new Error(copy.failedDisconnect);
      setConnectedSources((current) => {
        const next = { ...current };
        delete next[source];
        return next;
      });
    } catch {
      setError(copy.failedDisconnect);
    } finally {
      setPendingSource(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 border-b shrink-0 sticky top-0 z-30"
        style={{
          borderColor: "var(--rule)",
          backgroundColor: "var(--parchment)",
          height: "88px",
        }}
      >
        <div>
          <p className="eyebrow" style={{ color: "var(--slate)" }}>
            {t.integrations.eyebrow}
          </p>
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
            {t.integrations.heading}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-8 py-8 max-w-4xl space-y-8">
        {/* Hero banner */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASING }}
          className="relative overflow-hidden rounded-3xl px-8 py-10 sm:px-12 sm:py-14"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.97 0.04 300) 0%, oklch(0.96 0.05 260) 45%, oklch(0.97 0.04 350) 100%)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "oklch(0.62 0.22 295 / 0.08)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full blur-3xl"
            style={{ background: "oklch(0.62 0.22 295 / 0.05)" }}
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1"
                style={{
                  border: "1px solid rgba(139,92,246,0.25)",
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(8px)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "oklch(0.45 0.18 290)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "oklch(0.62 0.22 295)" }}
                />
                Anslutningar
              </span>

              <h2
                className="mt-5 leading-[1.05]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 4vw, 2.75rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "oklch(0.14 0.02 280)",
                }}
              >
                Koppla dina viktigaste kanaler{" "}
                <span
                  style={{
                    fontStyle: "italic",
                    background:
                      "linear-gradient(to right, oklch(0.62 0.22 295), oklch(0.65 0.21 330))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  på 2 minuter.
                </span>
              </h2>

              <p
                className="mt-5"
                style={{
                  fontSize: "15px",
                  color: "oklch(0.38 0.06 280)",
                  lineHeight: 1.65,
                  maxWidth: "420px",
                }}
              >
                Hämta in statistik automatiskt från dina viktigaste plattformar.
                Ingen teknisk kunskap krävs — vi sköter behörigheter, synk och
                uppdateringar.
              </p>

              <div className="mt-6 flex items-center gap-2">
                <ShieldCheck
                  className="h-4 w-4 shrink-0"
                  style={{ color: "oklch(0.55 0.18 155)" }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    color: "oklch(0.38 0.06 280)",
                    fontWeight: 500,
                  }}
                >
                  Clarix läser endast statistik. Vi publicerar aldrig innehåll.
                </span>
              </div>
            </div>

            {/* floating logo cluster */}
            <div className="relative hidden h-28 w-64 shrink-0 lg:block">
              {[GoogleAnalyticsLogo, GoogleAdsLogo, GoogleSearchConsoleLogo].map(
                (Logo, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.08, ease: EASING }}
                    className="absolute flex items-center justify-center rounded-2xl border bg-white"
                    style={{
                      width: 56,
                      height: 56,
                      left: i * 62,
                      top: i % 2 === 1 ? 20 : 0,
                      borderColor: "rgba(139,92,246,0.15)",
                      boxShadow:
                        "0 8px 32px -8px rgba(139,92,246,0.2), 0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <Logo className="h-7 w-7" />
                  </motion.div>
                ),
              )}
            </div>
          </div>
        </motion.section>

        {/* Progress bar */}
        {!loadingConnections && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: EASING }}
            className="rounded-2xl p-5"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles
                  className="h-4 w-4"
                  style={{ color: "oklch(0.62 0.22 295)" }}
                />
                <p
                  style={{ fontSize: "13px", fontWeight: 600, color: "var(--charcoal)" }}
                >
                  {connectedCount} av {totalAvailable} kanaler kopplade
                </p>
              </div>
              <span
                style={{ fontSize: "12px", fontWeight: 700, color: "var(--charcoal)" }}
              >
                {Math.round((connectedCount / totalAvailable) * 100)}%
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--rule)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(connectedCount / totalAvailable) * 100}%` }}
                transition={{ duration: 0.8, ease: EASING }}
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, var(--accent-coral), var(--accent-amber))",
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Error / loading banner */}
        {(loadingConnections || error) && (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: "var(--bone)",
              border: "1px solid var(--rule)",
              color: error ? "var(--signal-down)" : "var(--slate)",
              fontSize: "13px",
            }}
          >
            {error ?? copy.loadingConnections}
            {properties.error?.type === "auth" && (
              <a
                href="/login"
                className="ml-3 underline"
                style={{ color: "var(--charcoal)", fontWeight: 600 }}
              >
                {copy.reconnect}
              </a>
            )}
          </div>
        )}

        {/* Integration cards */}
        <div className="flex flex-col gap-5">
          {VISUAL_INTEGRATIONS.map((integ, i) => {
            const isConnectable = integ.id === "ga4" || integ.id === "gsc";
            const connected = isConnectable
              ? Boolean(connectedSources[integ.id as ConnectableSource])
              : false;
            const connectedSource = isConnectable
              ? connectedSources[integ.id as ConnectableSource]
              : undefined;
            const isPending = pendingSource === integ.id;

            return (
              <motion.div
                key={integ.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.07, ease: EASING }}
                className="group relative flex flex-col overflow-hidden rounded-2xl p-7 transition-all hover:-translate-y-0.5"
                style={{
                  backgroundColor: "var(--bone)",
                  border: "1px solid var(--rule)",
                  opacity: integ.available ? 1 : 0.55,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* top shine on hover */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, oklch(0.62 0.22 295 / 0.4), transparent)",
                  }}
                />

                <div className="flex items-start gap-5">
                  <BrandMark integ={integ} size={56} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
                      <p
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--charcoal)",
                          fontFamily: "var(--font-display)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {integ.name}
                      </p>
                      {connected && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "var(--signal-up-bg)",
                            color: "var(--signal-up)",
                            fontSize: "10px",
                            fontWeight: 600,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: "var(--signal-up)" }}
                          />
                          {t.integrations.badges.connected}
                        </span>
                      )}
                      {!integ.available && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "var(--bone-dark)",
                            color: "var(--slate)",
                            fontSize: "10px",
                            fontWeight: 500,
                          }}
                        >
                          {t.integrations.badges.comingSoon}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--slate-light)",
                        marginBottom: "6px",
                      }}
                    >
                      {integ.category}
                    </p>

                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--slate)",
                        lineHeight: 1.55,
                        marginBottom: "12px",
                      }}
                    >
                      {integ.purpose}
                    </p>

                    {connectedSource && (
                      <div style={{ marginBottom: "12px" }}>
                        <p style={{ fontSize: "12px", color: "var(--slate)" }}>
                          {copy.connectedTo}{" "}
                          <span
                            style={{ color: "var(--charcoal)", fontWeight: 600 }}
                          >
                            {connectedSource.display_name ?? connectedSource.property_id}
                          </span>
                        </p>
                        {connectedSource.needs_refresh && (
                          <div
                            className="mt-2 rounded-xl px-3 py-2"
                            style={{
                              backgroundColor: "var(--bone-dark)",
                              border: "1px solid var(--rule)",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "12px",
                                color: "var(--charcoal)",
                                fontWeight: 600,
                              }}
                            >
                              {copy.refreshNeeded}
                            </p>
                            <p
                              style={{
                                fontSize: "11.5px",
                                color: "var(--slate)",
                                marginTop: "2px",
                              }}
                            >
                              {copy.refreshHelp}{" "}
                              <a
                                href="/login"
                                className="underline"
                                style={{ color: "var(--charcoal)", fontWeight: 600 }}
                              >
                                {copy.reconnect}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {integ.unlocks.map((u) => (
                        <span
                          key={u}
                          className="px-2.5 py-1 rounded-lg"
                          style={{
                            fontSize: "11px",
                            fontWeight: 500,
                            backgroundColor: "var(--rule-light)",
                            color: "var(--slate)",
                          }}
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0 mt-0.5">
                    {integ.available && !connected && (
                      <button
                        onClick={() => setActiveModal(integ)}
                        disabled={loadingConnections}
                        className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-40"
                        style={{
                          backgroundColor: "var(--charcoal)",
                          color: "var(--parchment)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t.integrations.actions.connect}
                      </button>
                    )}
                    {connected && (
                      <button
                        onClick={() =>
                          setActiveModal(integ)
                        }
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:opacity-70 disabled:opacity-40"
                        style={{
                          border: "1px solid var(--rule)",
                          color: "var(--slate)",
                          backgroundColor: "transparent",
                        }}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Hantera
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: EASING }}
          style={{ fontSize: "12px", color: "var(--slate-light)", lineHeight: 1.6 }}
        >
          {t.integrations.trust}
        </motion.p>
      </main>

      {/* Connect / manage modal */}
      <AnimatePresence>
        {activeModal && (
          <ConnectModal
            integration={activeModal}
            connectedSource={
              (activeModal.id === "ga4" || activeModal.id === "gsc")
                ? connectedSources[activeModal.id as ConnectableSource]
                : undefined
            }
            options={
              (activeModal.id === "ga4" || activeModal.id === "gsc")
                ? optionsBySource[activeModal.id as ConnectableSource]
                : []
            }
            loadingProperties={loadingProperties}
            pendingSource={pendingSource}
            copy={copy}
            onClose={() => setActiveModal(null)}
            onConnect={(option) =>
              connectSource(activeModal.id as ConnectableSource, option)
            }
            onDisconnect={() => {
              disconnectSource(activeModal.id as ConnectableSource);
              setActiveModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── ConnectModal ─── */

function ConnectModal({
  integration,
  connectedSource,
  options,
  loadingProperties,
  pendingSource,
  copy,
  onClose,
  onConnect,
  onDisconnect,
}: {
  integration: VisualIntegration;
  connectedSource: ConnectedSource | undefined;
  options: PropertyOption[];
  loadingProperties: boolean;
  pendingSource: ConnectableSource | null;
  copy: (typeof COPY)["en"];
  onClose: () => void;
  onConnect: (option: PropertyOption) => void;
  onDisconnect: () => void;
}) {
  const isConnected = Boolean(connectedSource);
  const isPending = pendingSource === integration.id;

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
        className="relative w-full max-w-md overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: "var(--parchment)",
          borderColor: "var(--rule)",
          boxShadow: "0 24px 80px -12px rgba(0,0,0,0.35)",
        }}
      >
        {/* Browser-chrome header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ backgroundColor: "var(--bone)", borderColor: "var(--rule)" }}
        >
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3" style={{ color: "var(--slate-light)" }} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--slate)",
              }}
            >
              accounts.google.com
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-[var(--rule)]"
            style={{ color: "var(--slate)" }}
            aria-label="Stäng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Integration identity */}
          <div className="flex items-center gap-3 mb-6">
            <BrandMark integ={integration} size={44} />
            <div className="flex-1">
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--slate-light)",
                  fontWeight: 600,
                }}
              >
                {integration.category}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--charcoal)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {integration.name}
              </p>
            </div>
          </div>

          {isConnected ? (
            /* ── Connected state ── */
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--signal-up-bg)" }}
                >
                  <Check
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--signal-up)" }}
                  />
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--charcoal)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Ansluten
                </h2>
              </div>

              <p style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "16px" }}>
                Data synkas automatiskt från {integration.name}.
              </p>

              <div
                className="rounded-xl p-4 space-y-3 mb-4"
                style={{
                  backgroundColor: "var(--bone)",
                  border: "1px solid var(--rule)",
                  fontSize: "13px",
                }}
              >
                <ModalRow
                  label="Egendom"
                  value={
                    connectedSource?.display_name ?? connectedSource?.property_id ?? "—"
                  }
                />
                <ModalRow
                  label="Status"
                  value={
                    <span style={{ color: "var(--signal-up)", fontWeight: 600 }}>
                      Aktiv
                    </span>
                  }
                />
                <ModalRow label="Senast synkad" value="Just nu" />
              </div>

              {connectedSource?.needs_refresh && (
                <div
                  className="rounded-xl px-3 py-2.5 mb-4"
                  style={{
                    backgroundColor: "var(--bone-dark)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--charcoal)",
                    }}
                  >
                    {copy.refreshNeeded}
                  </p>
                  <p style={{ fontSize: "11.5px", color: "var(--slate)", marginTop: "2px" }}>
                    {copy.refreshHelp}{" "}
                    <a
                      href="/login"
                      className="underline"
                      style={{ color: "var(--charcoal)", fontWeight: 600 }}
                    >
                      {copy.reconnect}
                    </a>
                  </p>
                </div>
              )}

              <div className="flex justify-between gap-2 mt-6">
                <button
                  onClick={onDisconnect}
                  disabled={isPending}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{
                    border: "1px solid var(--rule)",
                    color: "var(--signal-down)",
                    backgroundColor: "transparent",
                  }}
                >
                  {isPending ? copy.disconnecting : "Koppla ifrån"}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "var(--charcoal)",
                    color: "var(--parchment)",
                  }}
                >
                  Klar
                </button>
              </div>
            </div>
          ) : (
            /* ── Connect state: property picker ── */
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "var(--charcoal)",
                  letterSpacing: "-0.02em",
                  marginBottom: "4px",
                }}
              >
                Välj egendom att ansluta
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--slate)",
                  marginBottom: "16px",
                }}
              >
                {loadingProperties ? copy.loadingProperties : copy.choose}
              </p>

              {loadingProperties && (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    style={{ color: "var(--slate-light)" }}
                  />
                </div>
              )}

              {!loadingProperties && options.length === 0 && (
                <p style={{ fontSize: "13px", color: "var(--slate)" }}>
                  {copy.noProperties}
                </p>
              )}

              {!loadingProperties && options.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onConnect(option)}
                      disabled={isPending}
                      className="w-full text-left rounded-xl px-3.5 py-3 transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--bone)",
                        border: "1px solid var(--rule)",
                        color: "var(--charcoal)",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {isPending ? copy.connecting : option.displayName}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          color: "var(--slate)",
                        }}
                      >
                        {option.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div
                className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: "var(--bone)",
                  border: "1px solid var(--rule)",
                }}
              >
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--signal-up)" }}
                />
                <p style={{ fontSize: "11.5px", color: "var(--slate)", lineHeight: 1.5 }}>
                  Clarix läser endast statistik. Vi publicerar aldrig innehåll och kan
                  inte ändra eller radera data.
                </p>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    border: "1px solid var(--rule)",
                    color: "var(--slate)",
                    backgroundColor: "transparent",
                  }}
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Helpers ─── */

function ModalRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--slate)" }}>{label}</span>
      <span
        style={{
          maxWidth: "60%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "right",
          fontWeight: 600,
          color: "var(--charcoal)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
