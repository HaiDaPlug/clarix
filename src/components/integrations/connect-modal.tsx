"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import type {
  ConnectedSource,
} from "@/lib/google/connected-sources";

type PropertyOption = { id: string; displayName: string };

type VisualIntegration = {
  id: string;
  name: string;
  category: string;
  Logo: ((p: { className?: string }) => React.ReactElement) | null;
  color: string;
};

export type ConnectModalCopy = {
  loadingProperties: string;
  choose: string;
  noProperties: string;
  reconnect: string;
  connectedTo: string;
  refreshNeeded: string;
  refreshHelp: string;
  connecting: string;
  disconnecting: string;
  failedConnect: string;
  failedDisconnect: string;
  failedConnections: string;
  failedProperties: string;
  loadingConnections: string;
};

/* ─── BrandMark ─── */

export function BrandMark({
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

/* ─── ModalRow ─── */

export function ModalRow({
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

/* ─── ConnectModal ─── */

export function ConnectModal({
  integration,
  connectedSource,
  options,
  loadingProperties,
  pendingOptionId,
  copy,
  onClose,
  onConnect,
  onDisconnect,
}: {
  integration: VisualIntegration;
  connectedSource: ConnectedSource | undefined;
  options: PropertyOption[];
  loadingProperties: boolean;
  pendingOptionId: string | null;
  copy: ConnectModalCopy;
  onClose: () => void;
  onConnect: (option: PropertyOption) => void;
  onDisconnect: () => void;
}) {
  const isConnected = Boolean(connectedSource);
  const isPending = pendingOptionId !== null;

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
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--slate)" }}>
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
            <ConnectedState
              connectedSource={connectedSource!}
              isPending={isPending}
              copy={copy}
              onClose={onClose}
              onDisconnect={onDisconnect}
            />
          ) : (
            <ConnectState
              options={options}
              loadingProperties={loadingProperties}
              pendingOptionId={pendingOptionId}
              copy={copy}
              onClose={onClose}
              onConnect={onConnect}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConnectedState({
  connectedSource,
  isPending,
  copy,
  onClose,
  onDisconnect,
}: {
  connectedSource: ConnectedSource;
  isPending: boolean;
  copy: ConnectModalCopy;
  onClose: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--signal-up-bg)" }}
        >
          <Check className="h-3.5 w-3.5" style={{ color: "var(--signal-up)" }} />
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
        Data synkas automatiskt.
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
          value={connectedSource.display_name ?? connectedSource.property_id ?? "—"}
        />
        <ModalRow
          label="Status"
          value={<span style={{ color: "var(--signal-up)", fontWeight: 600 }}>Aktiv</span>}
        />
        <ModalRow label="Senast synkad" value="Just nu" />
      </div>

      {connectedSource.needs_refresh && (
        <div
          className="rounded-xl px-3 py-2.5 mb-4"
          style={{ backgroundColor: "var(--bone-dark)", border: "1px solid var(--rule)" }}
        >
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--charcoal)" }}>
            {copy.refreshNeeded}
          </p>
          <p style={{ fontSize: "11.5px", color: "var(--slate)", marginTop: "2px" }}>
            {copy.refreshHelp}{" "}
            <a href="/login" className="underline" style={{ color: "var(--charcoal)", fontWeight: 600 }}>
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
          style={{ border: "1px solid var(--rule)", color: "var(--signal-down)", backgroundColor: "transparent" }}
        >
          {isPending ? copy.disconnecting : "Koppla ifrån"}
        </button>
        <button
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
        >
          Klar
        </button>
      </div>
    </div>
  );
}

function ConnectState({
  options,
  loadingProperties,
  pendingOptionId,
  copy,
  onClose,
  onConnect,
}: {
  options: PropertyOption[];
  loadingProperties: boolean;
  pendingOptionId: string | null;
  copy: ConnectModalCopy;
  onClose: () => void;
  onConnect: (option: PropertyOption) => void;
}) {
  const anyPending = pendingOptionId !== null;

  return (
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
      <p style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "16px" }}>
        {loadingProperties ? copy.loadingProperties : copy.choose}
      </p>

      {/* Loading state */}
      <AnimatePresence mode="wait">
        {loadingProperties && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center justify-center gap-3 py-10"
          >
            <div
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "var(--bone)",
                border: "1px solid var(--rule)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--slate)" }} />
            </div>
            <p style={{ fontSize: "13px", color: "var(--slate-light)" }}>
              {copy.loadingProperties}
            </p>
          </motion.div>
        )}

        {/* Empty state */}
        {!loadingProperties && options.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl p-5 mb-4"
            style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
          >
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--charcoal)", marginBottom: "6px" }}>
              Inga egendomar hittades
            </p>
            <p style={{ fontSize: "13px", color: "var(--slate)", lineHeight: "1.5" }}>
              Kontot du loggade in med har ingen GA4-egendom kopplad. Logga in med Google-kontot som äger egendomen.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 mt-4 rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
            >
              Logga in med annat konto
            </a>
          </motion.div>
        )}

        {/* Property list */}
        {!loadingProperties && options.length > 0 && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-2 mb-4 overflow-y-auto pr-0.5"
            style={{ maxHeight: "224px" }}
          >
            {options.map((option, i) => {
              const isThisPending = pendingOptionId === option.id;
              const isDimmed = anyPending && !isThisPending;
              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  onClick={() => onConnect(option)}
                  disabled={anyPending}
                  className="w-full text-left rounded-2xl px-4 py-3.5 transition-all group"
                  style={{
                    backgroundColor: isThisPending ? "var(--charcoal)" : "var(--bone)",
                    border: isThisPending
                      ? "1px solid var(--charcoal)"
                      : "1px solid var(--rule)",
                    opacity: isDimmed ? 0.4 : 1,
                    cursor: anyPending ? "default" : "pointer",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: isThisPending ? "var(--parchment)" : "var(--charcoal)",
                          lineHeight: 1.3,
                        }}
                      >
                        {option.displayName}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          color: isThisPending ? "rgba(255,255,255,0.55)" : "var(--slate-light)",
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {option.id}
                      </span>
                    </div>
                    <div
                      style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isThisPending
                          ? "rgba(255,255,255,0.15)"
                          : "var(--parchment)",
                        border: isThisPending ? "none" : "1px solid var(--rule)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {isThisPending ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          style={{ color: "var(--parchment)" }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: "10px", fontWeight: 700,
                            color: "var(--slate)",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          →
                        </span>
                      )}
                    </div>
                  </div>
                  {isThisPending && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.6)",
                        marginTop: "6px",
                      }}
                    >
                      {copy.connecting}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-1"
        style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--signal-up)" }} />
        <p style={{ fontSize: "11.5px", color: "var(--slate)", lineHeight: 1.5 }}>
          Clarix läser endast statistik. Vi publicerar aldrig innehåll och kan
          inte ändra eller radera data.
        </p>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={onClose}
          disabled={anyPending}
          className="rounded-full px-4 py-2 text-sm font-medium transition-all disabled:opacity-40"
          style={{ border: "1px solid var(--rule)", color: "var(--slate)", backgroundColor: "transparent" }}
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
