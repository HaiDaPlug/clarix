"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import {
  ArrowRight,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ConnectableSource,
  GooglePropertiesResponse,
} from "@/lib/google/connected-sources";
import type { GoogleConnectionHealth } from "@/lib/google/connection-types";
import type { ClientWorkspace, ClientsResponse } from "@/lib/clients/types";
import { workspaceNameFromProperty } from "@/lib/clients/naming";
import { clearReportSnapshots } from "@/lib/report-snapshot";
import {
  GoogleAnalyticsLogo,
  GoogleSearchConsoleLogo,
  GoogleAdsLogo,
} from "@/components/landing/brand-logos";
import {
  BrandMark,
  ConnectModal,
} from "@/components/integrations/connect-modal";
import { GoogleConnectionCard } from "@/components/integrations/GoogleConnectionCard";
import {
  INTEGRATIONS_COPY,
  noticeFromReturnParams,
  type ReturnNotice,
} from "@/components/integrations/copy";

const EASING = [0.16, 1, 0.3, 1] as const;

const INTEGRATION_IDS = ["ga4", "gsc", "google_ads"] as const;
type IntegrationId = (typeof INTEGRATION_IDS)[number];

type PropertyOption = { id: string; displayName: string };

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

/* ─── Data fetchers (no React state; callers decide what to do with the result) ─── */

const UNAVAILABLE_HEALTH: GoogleConnectionHealth = {
  status: "error",
  reason: "google_unavailable",
  scopes: [],
  missingScopes: [],
  connectedAt: null,
  lastRefreshedAt: null,
  tokenExpiresAt: null,
  checkedAt: new Date(0).toISOString(),
};

// verify=1 forces a refresh round-trip so a dead grant can never show green here.
async function fetchGoogleHealth(verify: boolean): Promise<GoogleConnectionHealth | "unauthorized"> {
  try {
    const response = await fetch(`/api/google/connection${verify ? "?verify=1" : ""}`, { cache: "no-store" });
    if (response.status === 401) return "unauthorized";
    const payload = (await response.json()) as { google?: GoogleConnectionHealth };
    return payload.google ?? { ...UNAVAILABLE_HEALTH, checkedAt: new Date().toISOString() };
  } catch {
    return { ...UNAVAILABLE_HEALTH, checkedAt: new Date().toISOString() };
  }
}

async function fetchClients(): Promise<ClientsResponse | "unauthorized" | null> {
  try {
    const response = await fetch("/api/clients", { cache: "no-store" });
    if (response.status === 401) return "unauthorized";
    if (!response.ok) return null;
    return (await response.json()) as ClientsResponse;
  } catch {
    return null;
  }
}

/* ─── Page ─── */

// useSearchParams() opts the page out of static prerendering; the Suspense
// boundary keeps the build happy and matches the dashboard/report pattern.
export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsPageInner />
    </Suspense>
  );
}

function IntegrationsPageInner() {
  const { locale, t } = useLocale();
  const copy = INTEGRATIONS_COPY[locale];
  const router = useRouter();
  const searchParams = useSearchParams();

  const [google, setGoogle] = useState<GoogleConnectionHealth | null>(null);
  const [checkingGoogle, setCheckingGoogle] = useState(true);
  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [properties, setProperties] = useState<GooglePropertiesResponse>({ ga4: [], gsc: [] });
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propertiesLoadedFor, setPropertiesLoadedFor] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<VisualIntegration | null>(null);
  const [pendingSource, setPendingSource] = useState<ConnectableSource | null>(null);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [removingSource, setRemovingSource] = useState<ConnectableSource | null>(null);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The `?google=…` return params from the OAuth callback are read once, at
  // mount, and turned into a one-shot notice; the URL is cleaned right after.
  const [notice, setNotice] = useState<ReturnNotice | null>(() =>
    noticeFromReturnParams(searchParams.get("google"), searchParams.get("reason"), copy),
  );

  const activeClient = useMemo(() => clients.find((c) => c.isActive) ?? null, [clients]);
  const googleReady = google?.status === "connected";

  // ── Initial load. The return params are removed from the URL so a refresh
  //    doesn't replay the notice; the health check runs with verify=1 so the
  //    page reflects Google's opinion of the grant, not a stored timestamp.
  const cleanedUrlRef = useRef(false);
  useEffect(() => {
    if (!cleanedUrlRef.current && searchParams.get("google")) {
      cleanedUrlRef.current = true;
      router.replace("/integrations");
    }

    let cancelled = false;
    async function initialLoad() {
      const [health, clientsPayload] = await Promise.all([fetchGoogleHealth(true), fetchClients()]);
      if (cancelled) return;
      if (health === "unauthorized" || clientsPayload === "unauthorized") {
        window.location.assign("/login");
        return;
      }
      setGoogle(health);
      setCheckingGoogle(false);
      if (clientsPayload) setClients(clientsPayload.clients);
      else setError(copy.failedConnections);
      setLoadingClients(false);
    }
    void initialLoad();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-verifies the grant on demand (retry button, after reconnect).
  async function recheckGoogle() {
    setCheckingGoogle(true);
    const health = await fetchGoogleHealth(true);
    if (health === "unauthorized") {
      window.location.assign("/login");
      return;
    }
    setGoogle(health);
    setCheckingGoogle(false);
  }

  // ── Properties: only once Google is verified usable, and only once per grant.
  const shouldLoadProperties = googleReady && !checkingGoogle && propertiesLoadedFor !== google?.connectedAt;
  useEffect(() => {
    if (!shouldLoadProperties || !google) return;
    let cancelled = false;
    const grantKey = google.connectedAt;
    async function loadProperties() {
      setLoadingProperties(true);
      try {
        const response = await fetch("/api/google/properties", { cache: "no-store" });
        const payload = (await response.json()) as GooglePropertiesResponse;
        if (cancelled) return;
        setProperties(payload);
        if (payload.google) setGoogle(payload.google);
        if (payload.error) setError(payload.error.message);
        setPropertiesLoadedFor(grantKey);
      } catch {
        if (!cancelled) setError(copy.failedProperties);
      } finally {
        if (!cancelled) setLoadingProperties(false);
      }
    }
    void loadProperties();
    return () => { cancelled = true; };
  }, [shouldLoadProperties, google, copy.failedProperties]);

  const optionsBySource = useMemo(
    (): Record<ConnectableSource, PropertyOption[]> => ({
      ga4: properties.ga4.map((p) => ({ id: p.propertyId, displayName: p.displayName })),
      gsc: properties.gsc.map((s) => ({ id: s.siteUrl, displayName: s.displayName })),
    }),
    [properties],
  );

  const applyClient = useCallback((updated: ClientWorkspace) => {
    setClients((current) => {
      const exists = current.some((c) => c.id === updated.id);
      const next = exists ? current.map((c) => (c.id === updated.id ? updated : c)) : [...current, updated];
      // Only one workspace may be active; mirror the server's invariant locally.
      return updated.isActive ? next.map((c) => (c.id === updated.id ? c : { ...c, isActive: false })) : next;
    });
  }, []);

  async function selectProperty(source: ConnectableSource, option: PropertyOption) {
    setPendingSource(source);
    setPendingOptionId(option.id);
    setError(null);
    try {
      let target = activeClient;
      if (!target) {
        // First property ever: create the workspace from it, silently.
        const created = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workspaceNameFromProperty(option.displayName, option.id),
            sources: { [source]: { propertyId: option.id, displayName: option.displayName } },
            activate: true,
          }),
        });
        if (!created.ok) {
          const payload = (await created.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(payload.error?.message ?? copy.failedConnect);
        }
        const payload = (await created.json()) as { client: ClientWorkspace };
        applyClient(payload.client);
        clearReportSnapshots();
        target = payload.client;
      } else {
        const response = await fetch(`/api/clients/${target.id}/sources`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, propertyId: option.id, displayName: option.displayName }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(payload.error?.message ?? copy.failedConnect);
        }
        const payload = (await response.json()) as { client: ClientWorkspace };
        applyClient(payload.client);
        clearReportSnapshots();
      }
      setActiveModal(null);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : copy.failedConnect);
    } finally {
      setPendingSource(null);
      setPendingOptionId(null);
    }
  }

  async function removeProperty(source: ConnectableSource) {
    if (!activeClient) return;
    setRemovingSource(source);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${activeClient.id}/sources`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!response.ok) throw new Error(copy.failedDisconnect);
      const payload = (await response.json()) as { client: ClientWorkspace };
      applyClient(payload.client);
      clearReportSnapshots();
      setActiveModal(null);
    } catch {
      setError(copy.failedDisconnect);
    } finally {
      setRemovingSource(null);
    }
  }

  function startGoogleConnect() {
    window.location.assign("/api/google/oauth/start?next=/integrations");
  }

  async function disconnectGoogle() {
    setDisconnectingGoogle(true);
    setError(null);
    try {
      const response = await fetch("/api/google/disconnect", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { google?: GoogleConnectionHealth; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? copy.failedDisconnect);
      if (payload.google) setGoogle(payload.google);
      setProperties({ ga4: [], gsc: [] });
      setPropertiesLoadedFor(null);
      clearReportSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.failedDisconnect);
    } finally {
      setDisconnectingGoogle(false);
    }
  }

  const loadingConnections = loadingClients;
  const connectedCount = INTEGRATION_IDS.filter((id) => {
    if (id === "ga4" || id === "gsc") return Boolean(activeClient?.sources[id]) && googleReady;
    return false;
  }).length;
  const totalAvailable = VISUAL_INTEGRATIONS.filter((i) => i.available).length;

  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex min-h-[88px] shrink-0 items-center justify-between gap-3 border-b py-3 pl-16 pr-4 sm:px-6 lg:px-8"
        style={{
          borderColor: "var(--rule)",
          backgroundColor: "var(--parchment)",
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
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold transition-all hover:opacity-80 sm:px-5"
          style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
        >
          <span className="hidden min-[380px]:inline">Gå till dashboard</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="flex-1 max-w-4xl space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* Hero banner */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASING }}
          className="relative overflow-hidden px-5 py-8 sm:px-12 sm:py-14"
          style={{
            // Same surface as the dashboard's summary panel: the aurora wash,
            // two glow pools and a little grain, with a real dark variant.
            background: "var(--insight-gradient)",
            border: "1px solid var(--insight-border)",
            borderRadius: "var(--radius-panel)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--insight-glow-b), transparent 70%)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--insight-glow-a), transparent 70%)" }}
            aria-hidden
          />
          <NoiseTexture preset="fine" blendMode="soft-light" opacity={0.3} />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1"
                style={{
                  border: "1px solid var(--insight-border)",
                  background: "var(--insight-card)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--insight-accent)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--insight-accent)" }}
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
                  color: "var(--insight-text)",
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
                  color: "var(--insight-text)",
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
                    color: "var(--insight-muted)",
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
                    className="absolute flex items-center justify-center rounded-2xl border"
                    style={{
                      width: 56,
                      height: 56,
                      left: i * 62,
                      top: i % 2 === 1 ? 20 : 0,
                      background: "var(--surface-card)",
                      borderColor: "var(--insight-border)",
                      boxShadow: "var(--shadow-raised)",
                    }}
                  >
                    <Logo className="h-7 w-7" />
                  </motion.div>
                ),
              )}
            </div>
          </div>
        </motion.section>

        {/* Return-from-Google notice */}
        <AnimatePresence>
          {notice && (
            <motion.div
              key="notice"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASING }}
              className="flex items-start justify-between gap-3 rounded-xl px-4 py-3.5"
              style={{
                backgroundColor:
                  notice.tone === "ok" ? "var(--signal-up-bg)" :
                  notice.tone === "warn" ? "rgba(201,123,42,0.10)" :
                  "rgba(185,28,28,0.06)",
                border: `1px solid ${
                  notice.tone === "ok" ? "rgba(45,106,79,0.25)" :
                  notice.tone === "warn" ? "rgba(201,123,42,0.3)" :
                  "rgba(185,28,28,0.2)"
                }`,
              }}
              role="status"
            >
              <p style={{ fontSize: "13px", color: "var(--charcoal)", lineHeight: 1.5 }}>{notice.text}</p>
              <button
                onClick={() => setNotice(null)}
                aria-label="Stäng"
                className="shrink-0 rounded-full p-1 transition-colors hover:bg-black/5"
                style={{ color: "var(--slate)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google account authorization health */}
        <GoogleConnectionCard
          health={google}
          loading={checkingGoogle && !google}
          disconnecting={disconnectingGoogle}
          copy={copy.google}
          onConnect={startGoogleConnect}
          onRetry={() => void recheckGoogle()}
          onDisconnect={() => void disconnectGoogle()}
        />

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
                  {copy.progress(connectedCount, totalAvailable)}
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
            {activeClient && (
              <p className="mt-3" style={{ fontSize: "12px", color: "var(--slate)" }}>
                {copy.workspaceHint}{" "}
                <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>{activeClient.name}</span>
                {clients.length > 1 && (
                  <>
                    {" · "}
                    <Link href="/clients" className="underline underline-offset-2" style={{ color: "var(--charcoal)" }}>
                      {copy.workspaceLink}
                    </Link>
                  </>
                )}
              </p>
            )}
          </motion.div>
        )}

        {/* Error / loading banner */}
        {(loadingConnections || error) && (
          <div
            className="rounded-xl px-4 py-4"
            style={{
              backgroundColor: error ? "rgba(185,28,28,0.06)" : "var(--bone)",
              border: error ? "1px solid rgba(185,28,28,0.2)" : "1px solid var(--rule)",
            }}
          >
            {error ? (
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(185,28,28,0.1)" }}
                >
                  <X className="h-3.5 w-3.5" style={{ color: "var(--signal-down)" }} />
                </div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--charcoal)", marginBottom: "2px" }}>
                    Något gick fel
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--slate)", lineHeight: "1.5" }}>
                    {error}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--slate)" }}>{copy.loadingConnections}</p>
            )}
          </div>
        )}

        {/* Integration cards */}
        <div className="flex flex-col gap-5">
          {VISUAL_INTEGRATIONS.map((integ, i) => {
            const isConnectable = integ.id === "ga4" || integ.id === "gsc";
            const selected = isConnectable ? activeClient?.sources[integ.id as ConnectableSource] : undefined;
            const hasSelection = Boolean(selected);
            const connected = hasSelection && googleReady;
            const isPending = pendingSource === integ.id || removingSource === integ.id;

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
                      {hasSelection && !connected && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "rgba(201,123,42,0.12)",
                            color: "#C97B2A",
                            fontSize: "10px",
                            fontWeight: 600,
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#C97B2A" }} />
                          {copy.reconnect}
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

                    {isConnectable && (
                      <div style={{ marginBottom: "12px" }}>
                        {selected ? (
                          <p style={{ fontSize: "12px", color: "var(--slate)" }}>
                            {activeClient ? copy.selectedFor(activeClient.name) : copy.connectedTo}
                            {": "}
                            <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>
                              {selected.displayName ?? selected.propertyId}
                            </span>
                          </p>
                        ) : (
                          <p style={{ fontSize: "12px", color: "var(--slate-light)" }}>
                            {googleReady || checkingGoogle ? copy.notSelected : copy.needsGoogle}
                          </p>
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
                    {integ.available && !hasSelection && (
                      <button
                        onClick={() => setActiveModal(integ)}
                        disabled={loadingConnections || !googleReady}
                        title={!googleReady ? copy.needsGoogle : undefined}
                        className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-40 disabled:hover:translate-y-0"
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
                    {hasSelection && (
                      <button
                        onClick={() => setActiveModal(integ)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:opacity-70 disabled:opacity-40"
                        style={{
                          border: "1px solid var(--rule)",
                          color: "var(--slate)",
                          backgroundColor: "transparent",
                        }}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {copy.manage}
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

      {/* Property picker / manage modal */}
      <AnimatePresence>
        {activeModal && (activeModal.id === "ga4" || activeModal.id === "gsc") && (
          <ConnectModal
            key={`${activeModal.id}:${activeClient?.id ?? "none"}`}
            integration={activeModal}
            selected={activeClient?.sources[activeModal.id as ConnectableSource]}
            workspaceName={activeClient?.name ?? null}
            options={optionsBySource[activeModal.id as ConnectableSource]}
            loadingProperties={loadingProperties}
            pendingOptionId={pendingOptionId}
            removing={removingSource === activeModal.id}
            googleReady={googleReady}
            copy={copy}
            onClose={() => setActiveModal(null)}
            onSelect={(option) => selectProperty(activeModal.id as ConnectableSource, option)}
            onRemove={() => void removeProperty(activeModal.id as ConnectableSource)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
