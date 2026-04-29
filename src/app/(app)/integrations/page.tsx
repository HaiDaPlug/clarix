"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useLocale } from "@/lib/i18n";
import type {
  ConnectableSource,
  ConnectedSource,
  GooglePropertiesResponse,
} from "@/lib/google/connected-sources";

const EASING = [0.16, 1, 0.3, 1] as const;

const INTEGRATION_IDS = ["ga4", "gsc", "google_ads"] as const;
type IntegrationId = (typeof INTEGRATION_IDS)[number];

const INTEGRATION_META: Record<IntegrationId, { icon: () => React.ReactElement; available: boolean; connected: boolean }> = {
  ga4: { icon: IconGA4, available: true, connected: false },
  gsc: { icon: IconGSC, available: true, connected: false },
  google_ads: { icon: IconAds, available: false, connected: false },
};

type PropertyOption = {
  id: string;
  displayName: string;
};

const COPY = {
  sv: {
    loadingConnections: "Hamtar anslutningar...",
    loadingProperties: "Hamtar tillgangliga egendomar...",
    choose: "Valj vilken egendom som ska anslutas.",
    noProperties: "Inga tillgangliga egendomar hittades for detta Google-konto.",
    reconnect: "Logga in med Google igen",
    connectedTo: "Ansluten till",
    failedConnections: "Kunde inte hamta anslutna kallor.",
    failedProperties: "Kunde inte hamta Google-egendomar.",
    failedConnect: "Kunde inte ansluta kallan.",
    failedDisconnect: "Kunde inte koppla fran kallan.",
    refreshNeeded: "Anslutningen behöver förnyas.",
    refreshHelp: "Logga in med Google igen för att ge servern en ny refresh token.",
    connecting: "Ansluter...",
    disconnecting: "Kopplar fran...",
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
  const [activePicker, setActivePicker] = useState<ConnectableSource | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [pendingSource, setPendingSource] = useState<ConnectableSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasMissingGoogleSource =
    !connectedSources.ga4 || !connectedSources.gsc;

  useEffect(() => {
    let cancelled = false;

    async function loadConnections() {
      setLoadingConnections(true);
      setError(null);

      const response = await fetch("/api/google/connections", {
        cache: "no-store",
      });

      if (cancelled) return;

      if (!response.ok) {
        setError(copy.failedConnections);
        setLoadingConnections(false);
        return;
      }

      const payload = (await response.json()) as {
        sources?: ConnectedSource[];
      };
      const bySource = (payload.sources ?? []).reduce<
        Partial<Record<ConnectableSource, ConnectedSource>>
      >((acc, source) => {
        if (source.source === "ga4" || source.source === "gsc") {
          const sourceId = source.source as ConnectableSource;
          acc[sourceId] = source as ConnectedSource;
        }
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
        const response = await fetch("/api/google/properties", {
          cache: "no-store",
        });
        const payload = (await response.json()) as GooglePropertiesResponse;

        if (cancelled) return;

        setProperties(payload);
        if (payload.error) {
          setError(payload.error.message);
        }
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
  }, [
    copy.failedProperties,
    hasMissingGoogleSource,
    loadingConnections,
  ]);

  const integrations = INTEGRATION_IDS.map((id) => ({
    id,
    ...INTEGRATION_META[id],
    ...t.integrations.sources[id],
    connected: id === "ga4" || id === "gsc" ? Boolean(connectedSources[id]) : false,
  }));

  const optionsBySource = useMemo(
    (): Record<ConnectableSource, PropertyOption[]> => ({
      ga4: properties.ga4.map((property) => ({
        id: property.propertyId,
        displayName: property.displayName,
      })),
      gsc: properties.gsc.map((site) => ({
        id: site.siteUrl,
        displayName: site.displayName,
      })),
    }),
    [properties],
  );

  async function connectSource(
    source: ConnectableSource,
    option: PropertyOption,
  ) {
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
        const payload = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(payload.error?.message ?? copy.failedConnect);
      }

      const payload = (await response.json()) as {
        needsRefresh?: boolean;
      };
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
      setActivePicker(null);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : copy.failedConnect,
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
      <header
        className="flex items-center justify-between px-8 py-5 border-b shrink-0 sticky top-0 z-10"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)" }}
      >
        <div>
          <p className="eyebrow" style={{ color: "var(--slate)" }}>{t.integrations.eyebrow}</p>
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

      <main className="flex-1 px-8 py-8 max-w-3xl">

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASING }}
          className="mb-8"
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "var(--charcoal)",
              lineHeight: 1.3,
              marginBottom: "10px",
            }}
          >
            {t.integrations.intro.headline.split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </p>
          <p style={{ fontSize: "14px", color: "var(--slate)", lineHeight: 1.65, maxWidth: "480px" }}>
            {t.integrations.intro.body}
          </p>
        </motion.div>

        {/* Integration cards */}
        <div className="flex flex-col gap-4">
          {(loadingConnections || error) && (
            <div
              className="rounded-2xl px-4 py-3"
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

          {integrations.map((integration, i) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: EASING }}
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "var(--bone)",
                border: "1px solid var(--rule)",
                opacity: integration.available ? 1 : 0.6,
              }}
            >
              <div className="flex items-start gap-5">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: "var(--bone-dark)" }}
                >
                  <integration.icon />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--charcoal)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {integration.name}
                    </p>
                    {integration.connected && (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "var(--signal-up-bg)", color: "var(--signal-up)", fontSize: "10px", fontWeight: 600 }}
                      >
                        {t.integrations.badges.connected}
                      </span>
                    )}
                    {!integration.available && (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "var(--bone-dark)", color: "var(--slate)", fontSize: "10px", fontWeight: 500 }}
                      >
                        {t.integrations.badges.comingSoon}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "4px" }}>
                    {integration.tagline}
                  </p>
                  <p style={{ fontSize: "12.5px", color: "var(--slate)", lineHeight: 1.55, marginBottom: "14px" }}>
                    {integration.description}
                  </p>

                  {(integration.id === "ga4" || integration.id === "gsc") &&
                    connectedSources[integration.id] && (
                      <div style={{ marginBottom: "14px" }}>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--slate)",
                          }}
                        >
                          {copy.connectedTo}{" "}
                          <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>
                            {connectedSources[integration.id]?.display_name ??
                              connectedSources[integration.id]?.property_id}
                          </span>
                        </p>
                        {connectedSources[integration.id]?.needs_refresh && (
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
                      </div>
                    )}

                  {/* Unlocks */}
                  <div className="flex flex-wrap gap-1.5">
                    {integration.unlocks.map((u) => (
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
                  {integration.available && !integration.connected && (
                    <button
                      onClick={() =>
                        setActivePicker((current) =>
                          current === integration.id
                            ? null
                            : (integration.id as ConnectableSource),
                        )
                      }
                      disabled={loadingConnections}
                      className="px-5 py-2.5 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: "var(--charcoal)",
                        color: "var(--parchment)",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: "none",
                      }}
                    >
                      {t.integrations.actions.connect}
                    </button>
                  )}
                  {integration.connected && (
                    <button
                      onClick={() =>
                        disconnectSource(integration.id as ConnectableSource)
                      }
                      disabled={pendingSource === integration.id}
                      className="px-5 py-2.5 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: "transparent",
                        color: "var(--slate)",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: "1px solid var(--rule)",
                      }}
                    >
                      {pendingSource === integration.id
                        ? copy.disconnecting
                        : t.integrations.actions.disconnect}
                    </button>
                  )}
                </div>
              </div>

              {(integration.id === "ga4" || integration.id === "gsc") &&
                activePicker === integration.id &&
                !integration.connected && (
                  <div
                    className="mt-5 pt-5"
                    style={{ borderTop: "1px solid var(--rule-light)" }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--slate)",
                        marginBottom: "10px",
                      }}
                    >
                      {loadingProperties ? copy.loadingProperties : copy.choose}
                    </p>

                    {!loadingProperties &&
                      optionsBySource[integration.id].length === 0 && (
                        <p style={{ fontSize: "12px", color: "var(--slate)" }}>
                          {copy.noProperties}
                        </p>
                      )}

                    <div className="flex flex-col gap-2">
                      {optionsBySource[integration.id].map((option) => (
                        <button
                          key={option.id}
                          onClick={() =>
                            connectSource(
                              integration.id as ConnectableSource,
                              option,
                            )
                          }
                          disabled={pendingSource === integration.id}
                          className="w-full text-left rounded-xl px-3.5 py-3 transition-colors cursor-pointer"
                          style={{
                            backgroundColor: "var(--parchment)",
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
                            {pendingSource === integration.id
                              ? copy.connecting
                              : option.displayName}
                          </span>
                          <span style={{ display: "block", fontSize: "11px", color: "var(--slate)" }}>
                            {option.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </motion.div>
          ))}
        </div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASING }}
          style={{ fontSize: "12px", color: "var(--slate-light)", marginTop: "24px", lineHeight: 1.6 }}
        >
          {t.integrations.trust}
        </motion.p>
      </main>
    </div>
  );
}

function IconGA4() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 3L4 19h14L11 3z" stroke="var(--charcoal)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11 9v6" stroke="var(--charcoal)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconGSC() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="var(--charcoal)" strokeWidth="1.4" />
      <path d="M11 7.5v4l3.5 2" stroke="var(--charcoal)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAds() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="10" width="4" height="9" rx="1.5" stroke="var(--charcoal)" strokeWidth="1.4" />
      <rect x="9" y="7" width="4" height="12" rx="1.5" stroke="var(--charcoal)" strokeWidth="1.4" />
      <rect x="15" y="4" width="4" height="15" rx="1.5" stroke="var(--charcoal)" strokeWidth="1.4" />
    </svg>
  );
}
