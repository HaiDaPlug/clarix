"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Unplug } from "lucide-react";
import type { GoogleConnectionHealth } from "@/lib/google/connection-types";

const EASING = [0.16, 1, 0.3, 1] as const;

export type GoogleConnectionCopy = {
  title: string;
  checking: string;
  connected: string;
  connectedHelp: string;
  reconnectRequired: string;
  reconnectHelp: Record<string, string>;
  disconnected: string;
  disconnectedHelp: string;
  error: string;
  errorHelp: Record<string, string>;
  connectCta: string;
  reconnectCta: string;
  retryCta: string;
  disconnectCta: string;
  disconnecting: string;
  lastChecked: (time: string) => string;
};

/**
 * The single place the UI states the truth about the Google grant. It only
 * ever renders what the server's health check returned — never "connected"
 * because a row exists.
 */
export function GoogleConnectionCard({
  health,
  loading,
  disconnecting,
  copy,
  onConnect,
  onRetry,
  onDisconnect,
}: {
  health: GoogleConnectionHealth | null;
  loading: boolean;
  disconnecting: boolean;
  copy: GoogleConnectionCopy;
  onConnect: () => void;
  onRetry: () => void;
  onDisconnect: () => void;
}) {
  const status = loading || !health ? "checking" : health.status;

  const tone =
    status === "connected"
      ? { dot: "var(--signal-up)", bg: "var(--signal-up-bg)", label: copy.connected }
      : status === "reconnect_required"
        ? { dot: "#C97B2A", bg: "rgba(201,123,42,0.12)", label: copy.reconnectRequired }
        : status === "error"
          ? { dot: "var(--signal-down)", bg: "rgba(185,28,28,0.08)", label: copy.error }
          : status === "checking"
            ? { dot: "var(--slate-light)", bg: "var(--bone-dark)", label: copy.checking }
            : { dot: "var(--slate)", bg: "var(--bone-dark)", label: copy.disconnected };

  const help =
    status === "connected"
      ? copy.connectedHelp
      : status === "reconnect_required"
        ? copy.reconnectHelp[health?.reason ?? "invalid_grant"] ?? copy.reconnectHelp.invalid_grant
        : status === "error"
          ? copy.errorHelp[health?.reason ?? "google_unavailable"] ?? copy.errorHelp.google_unavailable
          : status === "checking"
            ? ""
            : copy.disconnectedHelp;

  const Icon =
    status === "connected" ? CheckCircle2 :
    status === "reconnect_required" ? AlertTriangle :
    status === "error" ? AlertTriangle :
    status === "checking" ? Loader2 :
    Unplug;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: EASING }}
      className="rounded-2xl p-5 sm:p-6"
      style={{ backgroundColor: "var(--bone)", border: "1px solid var(--rule)" }}
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: tone.bg }}
          >
            <Icon
              className={`h-5 w-5 ${status === "checking" ? "animate-spin" : ""}`}
              style={{ color: tone.dot }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--charcoal)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.01em",
                }}
              >
                {copy.title}
              </p>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: tone.bg, color: tone.dot, fontSize: "10px", fontWeight: 600 }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
                {tone.label}
              </span>
            </div>
            {help && (
              <p style={{ fontSize: "13px", color: "var(--slate)", lineHeight: 1.55, marginTop: "6px", maxWidth: "52ch" }}>
                {help}
              </p>
            )}
            {health?.checkedAt && status !== "checking" && (
              <p style={{ fontSize: "11px", color: "var(--slate-light)", marginTop: "6px" }}>
                {copy.lastChecked(formatTime(health.checkedAt))}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {(status === "disconnected" || status === "reconnect_required") && (
            <button
              onClick={onConnect}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:opacity-90"
              style={{
                backgroundColor: "var(--charcoal)",
                color: "var(--parchment)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {status === "disconnected" ? copy.connectCta : copy.reconnectCta}
            </button>
          )}
          {status === "error" && health?.reason !== "server_misconfigured" && (
            <button
              onClick={onRetry}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {copy.retryCta}
            </button>
          )}
          {(status === "connected" || status === "reconnect_required") && (
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all hover:opacity-70 disabled:opacity-40"
              style={{ border: "1px solid var(--rule)", color: "var(--slate)", backgroundColor: "transparent" }}
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              {disconnecting ? copy.disconnecting : copy.disconnectCta}
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}
