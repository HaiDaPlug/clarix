"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

// GDPR erasure from the UI (integritetspolicy §8). Irreversible, so it is
// gated behind typing the confirmation word — a single click must never be
// able to destroy an account.

const CONFIRM_WORD = "RADERA";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const armed = confirm.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!armed || busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Kontot kunde inte raderas. Försök igen.");
        setBusy(false);
        return;
      }
      // The account is gone and the session cookies were cleared server-side.
      // A full navigation (not a router push) guarantees no stale client state
      // survives for a user that no longer exists.
      window.location.assign("/");
    } catch {
      setError("Kontot kunde inte raderas. Kontrollera din anslutning och försök igen.");
      setBusy(false);
    }
  }

  // At rest this is a quiet line at the foot of the profile; the full warning
  // (red frame, what gets deleted, the typed confirmation) only appears once
  // someone has chosen to start. The strongest treatment is kept for the step
  // that can actually destroy something.
  if (!open) {
    return (
      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-6" style={{ borderColor: "var(--line)" }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Radera kontot</p>
          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Tar bort kontot och all data permanent.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-ghost btn-sm hover:!text-[var(--signal-down)]"
        >
          Radera kontot…
        </button>
      </section>
    );
  }

  return (
    <section
      className="mt-6 rounded-xl p-5"
      style={{ border: "1px solid var(--signal-down)", backgroundColor: "var(--signal-down-bg)" }}
      role="group"
      aria-label="Bekräfta radering av kontot"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--signal-down)" }} aria-hidden />
        <div className="flex-1">
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            Radera kontot permanent?
          </p>
          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.6 }}>
            Allt tas bort direkt: ditt konto, dina arbetsytor, valda egendomar,
            mellanlagrad statistik och delade rapportlänkar. Åtkomsten till Google
            återkallas. Detta går inte att ångra.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <label htmlFor="delete-account-confirm" style={{ fontSize: "12.5px", color: "var(--text-primary)" }}>
              Skriv <strong>{CONFIRM_WORD}</strong> för att bekräfta.
            </label>
            <input
              id="delete-account-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              autoFocus
              className="field w-full max-w-[240px] rounded-xl px-3 py-2 text-sm"
            />

            {error && (
              <p role="alert" style={{ fontSize: "12.5px", color: "var(--signal-down)" }}>{error}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!armed || busy}
                className="btn btn-destructive"
              >
                {busy ? "Raderar…" : "Radera permanent"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                  setError(null);
                }}
                disabled={busy}
                className="btn btn-ghost"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
