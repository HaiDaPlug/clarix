"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { ClientSourceRef, ClientWorkspace, ClientsResponse } from "@/lib/clients/types";
import type { GoogleConnectionHealth } from "@/lib/google/connection-types";
import type { GooglePropertiesResponse } from "@/lib/google/connected-sources";
import { domainFromGscSiteUrl } from "@/lib/clients/naming";
import { clearReportSnapshots } from "@/lib/report-snapshot";
import { CLIENTS_COPY } from "@/components/clients/copy";
import { ClientEditor, type ClientEditorState, type PropertyOption } from "@/components/clients/ClientEditor";

const EASING = [0.16, 1, 0.3, 1] as const;

const AVATAR_GRADIENTS = [
  "from-violet-400 to-purple-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500",
  "from-pink-400 to-rose-500",
];

// "Kunder": every workspace the user has, which one is active, and the
// properties each one reports on. Switching is one click and is persisted
// server-side, so it survives refreshes and other browsers.
export default function ClientsPage() {
  const { locale } = useLocale();
  const copy = CLIENTS_COPY[locale];
  const router = useRouter();

  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [google, setGoogle] = useState<GoogleConnectionHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ClientEditorState | null>(null);
  const [properties, setProperties] = useState<GooglePropertiesResponse | null>(null);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const googleReady = google?.status === "connected";
  const activeClient = useMemo(() => clients.find((c) => c.isActive) ?? null, [clients]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/clients", { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) throw new Error(copy.loadFailed);
        const payload = (await response.json()) as ClientsResponse;
        if (cancelled) return;
        setClients(payload.clients);
        setGoogle(payload.google);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : copy.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [copy.loadFailed, router]);

  // Properties are needed only inside the editor; fetched lazily, once per grant.
  const needProperties = editor !== null && googleReady && properties === null && !loadingProperties;
  useEffect(() => {
    if (!needProperties) return;
    let cancelled = false;
    async function loadProperties() {
      setLoadingProperties(true);
      try {
        const response = await fetch("/api/google/properties", { cache: "no-store" });
        const payload = (await response.json()) as GooglePropertiesResponse;
        if (cancelled) return;
        setProperties(payload);
        if (payload.google) setGoogle(payload.google);
      } catch {
        if (!cancelled) setProperties({ ga4: [], gsc: [] });
      } finally {
        if (!cancelled) setLoadingProperties(false);
      }
    }
    void loadProperties();
    return () => { cancelled = true; };
  }, [needProperties]);

  const applyClient = useCallback((updated: ClientWorkspace) => {
    setClients((current) => {
      const exists = current.some((c) => c.id === updated.id);
      const next = exists ? current.map((c) => (c.id === updated.id ? updated : c)) : [...current, updated];
      return updated.isActive ? next.map((c) => (c.id === updated.id ? c : { ...c, isActive: false })) : next;
    });
  }, []);

  async function activate(client: ClientWorkspace, thenOpen = false) {
    if (client.isActive) {
      if (thenOpen) router.push("/dashboard");
      return;
    }
    setActivatingId(client.id);
    setError(null);
    // Optimistic: the switch must feel instantaneous and deliberate.
    const previous = clients;
    setClients((current) => current.map((c) => ({ ...c, isActive: c.id === client.id })));
    try {
      const response = await fetch(`/api/clients/${client.id}/activate`, { method: "POST" });
      if (!response.ok) throw new Error(copy.saveFailed);
      // Any cached report for the previous customer is now invalid in this tab.
      clearReportSnapshots();
      if (thenOpen) router.push("/dashboard");
    } catch (err) {
      setClients(previous);
      setError(err instanceof Error ? err.message : copy.saveFailed);
    } finally {
      setActivatingId(null);
    }
  }

  async function remove(client: ClientWorkspace) {
    if (!window.confirm(copy.confirmRemove(client.name))) return;
    setRemovingId(client.id);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(copy.saveFailed);
      const payload = (await response.json()) as { activeClientId: string | null };
      setClients((current) => {
        const rest = current.filter((c) => c.id !== client.id);
        return payload.activeClientId
          ? rest.map((c) => ({ ...c, isActive: c.id === payload.activeClientId }))
          : rest;
      });
      if (client.isActive) clearReportSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveFailed);
    } finally {
      setRemovingId(null);
    }
  }

  const optionsBySource = useMemo(
    (): Record<"ga4" | "gsc", PropertyOption[]> => ({
      ga4: (properties?.ga4 ?? []).map((p) => ({ id: p.propertyId, displayName: p.displayName })),
      gsc: (properties?.gsc ?? []).map((s) => ({ id: s.siteUrl, displayName: s.displayName })),
    }),
    [properties],
  );

  return (
    <div className="flex-1 flex flex-col min-h-dvh">
      <header
        className="sticky top-0 z-30 flex min-h-[88px] shrink-0 items-center justify-between gap-3 border-b py-3 pl-16 pr-4 sm:px-6 lg:px-8"
        style={{ borderColor: "var(--rule)", backgroundColor: "var(--parchment)" }}
      >
        <div>
          <p className="eyebrow" style={{ color: "var(--slate)" }}>{copy.eyebrow}</p>
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
            {copy.heading}
          </h1>
        </div>
        <button
          onClick={() => setEditor({ mode: "create" })}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
        >
          <Plus className="h-4 w-4" />
          {copy.newClient}
        </button>
      </header>

      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {google && google.status !== "connected" && google.status !== "error" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASING }}
            className="mb-5 flex flex-col gap-3 rounded-2xl px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            style={{ backgroundColor: "var(--bone)", border: "1px solid rgba(201,123,42,0.35)" }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#C97B2A" }} />
              <p style={{ fontSize: "13px", color: "var(--charcoal)", lineHeight: 1.45 }}>
                {google.status === "reconnect_required" ? copy.googleReconnect : copy.googleDisconnected}
              </p>
            </div>
            <Link
              href="/integrations"
              className="shrink-0 sm:ml-6"
              style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", textDecoration: "none" }}
            >
              {copy.googleReconnectCta}
            </Link>
          </motion.div>
        )}

        {error && (
          <div
            className="mb-5 flex items-start justify-between gap-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.2)" }}
            role="alert"
          >
            <p style={{ fontSize: "13px", color: "var(--charcoal)" }}>{error}</p>
            <button onClick={() => setError(null)} aria-label="Stäng" className="rounded-full p-1" style={{ color: "var(--slate)" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASING }}
          style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "24px" }}
        >
          {loading ? "…" : copy.count(clients.length)}
          {activeClient && !loading && (
            <>
              {" · "}
              <span style={{ color: "var(--charcoal)", fontWeight: 600 }}>{copy.active}: {activeClient.name}</span>
            </>
          )}
        </motion.p>

        {!loading && clients.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASING }}
            className="mb-6 rounded-2xl p-6 sm:p-8"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em" }}>
              {copy.emptyTitle}
            </p>
            <p style={{ fontSize: "13px", color: "var(--slate)", marginTop: "6px", maxWidth: "56ch", lineHeight: 1.55 }}>
              {copy.emptyBody}
            </p>
            <button
              onClick={() => setEditor({ mode: "create" })}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
            >
              <Plus className="h-4 w-4" />
              {copy.emptyCta}
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c, i) => {
            const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
            const isActivating = activatingId === c.id;
            const isRemoving = removingId === c.id;
            const domain = c.domain ?? (c.sources.gsc ? domainFromGscSiteUrl(c.sources.gsc.propertyId) : null);
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: EASING }}
                className="group relative overflow-hidden rounded-2xl p-6"
                style={{
                  backgroundColor: "var(--bone)",
                  border: c.isActive ? "1px solid var(--charcoal)" : "1px solid var(--rule)",
                  boxShadow: c.isActive ? "0 0 0 3px rgba(20,18,16,0.06)" : undefined,
                }}
              >
                <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-35`} />

                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-lg font-bold text-white`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditor({ mode: "edit", client: c })}
                        aria-label={copy.edit}
                        title={copy.edit}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--bone-dark)]"
                        style={{ color: "var(--slate)" }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void remove(c)}
                        disabled={isRemoving}
                        aria-label={copy.remove}
                        title={copy.remove}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[var(--bone-dark)] disabled:opacity-40"
                        style={{ color: "var(--slate)" }}
                      >
                        {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <h3
                    className="mt-4 truncate"
                    style={{ fontSize: "15px", fontWeight: 600, color: "var(--charcoal)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
                  >
                    {c.name}
                  </h3>
                  <p className="truncate" style={{ fontSize: "12px", color: "var(--slate)", marginTop: "2px", minHeight: "18px" }}>
                    {domain ?? " "}
                  </p>

                  <div className="mt-4 flex flex-col gap-1.5 pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
                    <SourceLine label={copy.ga4} value={c.sources.ga4} fallback={copy.notSelected} />
                    <SourceLine label={copy.gsc} value={c.sources.gsc} fallback={copy.notSelected} />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    {c.isActive ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{ background: "var(--signal-up-bg)", color: "var(--signal-up)", fontSize: "10px", fontWeight: 600 }}
                      >
                        <Check className="h-3 w-3" />
                        {copy.active}
                      </span>
                    ) : (
                      <button
                        onClick={() => void activate(c)}
                        disabled={isActivating || activatingId !== null}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ border: "1px solid var(--rule)", color: "var(--charcoal)", backgroundColor: "transparent" }}
                      >
                        {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {isActivating ? copy.activating : copy.activate}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => void activate(c, true)}
                    disabled={activatingId !== null && !isActivating}
                    className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)] disabled:opacity-40"
                    style={{ border: "1px solid var(--rule)", color: "var(--charcoal)" }}
                  >
                    {copy.open}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {!loading && (
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: clients.length * 0.06, ease: EASING }}
              onClick={() => setEditor({ mode: "create" })}
              className="flex min-h-[14rem] items-center justify-center rounded-2xl transition-colors hover:bg-[var(--bone)]"
              style={{ border: "1px dashed var(--rule)", color: "var(--slate)" }}
            >
              <div className="flex flex-col items-center gap-2">
                <Plus className="h-5 w-5" />
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{copy.newClient}</span>
              </div>
            </motion.button>
          )}
        </div>
      </main>

      <AnimatePresence>
        {editor && (
          <ClientEditor
            key={editor.mode === "edit" ? editor.client.id : "create"}
            state={editor}
            copy={copy}
            googleReady={googleReady}
            googleHealth={google}
            options={optionsBySource}
            loadingProperties={loadingProperties}
            hasActive={Boolean(activeClient)}
            onClose={() => setEditor(null)}
            onSaved={(client, activated) => {
              applyClient(client);
              if (activated || client.isActive) clearReportSnapshots();
              setEditor(null);
            }}
            onError={(message) => setError(message)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceLine({ label, value, fallback }: { label: string; value: ClientSourceRef | undefined; fallback: string }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ fontSize: "12px" }}>
      <span style={{ color: "var(--slate)" }}>{label}</span>
      <span
        className="truncate"
        style={{ color: value ? "var(--charcoal)" : "var(--slate-light)", fontWeight: value ? 600 : 400, maxWidth: "60%" }}
        title={value?.displayName ?? value?.propertyId ?? undefined}
      >
        {value ? value.displayName ?? value.propertyId : fallback}
      </span>
    </div>
  );
}
