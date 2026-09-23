"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { daysUntilExpiry, type ShareLinkState } from "@/lib/reports/share-links";

type ShareLink = {
  id: string;
  periodStart: string;
  periodEnd: string;
  workspaceLabel: string | null;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  state: ShareLinkState;
};

const dateFmt = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "short", day: "numeric" });

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

// Owner-facing management of shared report links (GDPR: the person who
// published a snapshot must be able to withdraw it). The plaintext token is
// never stored, so this view can show that a link exists and revoke it, but
// cannot show the URL again.
export function ShareLinks() {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/share/links");
      if (!res.ok) {
        setError("Kunde inte hämta delningslänkar.");
        setLinks([]);
        return;
      }
      const json = (await res.json()) as { links: ShareLink[] };
      setLinks(json.links);
      setError(null);
    } catch {
      setError("Kunde inte hämta delningslänkar.");
      setLinks([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/reports/share/links/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Kunde inte återkalla länken.");
        setBusyId(null);
        return;
      }
      await load();
    } catch {
      setError("Kunde inte återkalla länken.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, color: "var(--charcoal)", letterSpacing: "-0.02em" }}>
          Delade rapportlänkar
        </p>
        <p style={{ fontSize: "13px", color: "var(--slate)", marginTop: "3px", lineHeight: 1.6 }}>
          Alla som har länken kan öppna rapporten utan att logga in. Länkar slutar
          fungera automatiskt efter 90 dagar — återkalla tidigare när du vill.
        </p>
      </div>

      {error && (
        <p style={{ fontSize: "12.5px", color: "var(--signal-down)" }}>{error}</p>
      )}

      {links === null ? (
        <ul className="flex flex-col gap-2" aria-label="Hämtar…">
          {[0, 1].map((k) => (
            <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-4" aria-hidden>
              <div className="min-w-0 flex-1">
                <div className="skeleton h-3.5 w-40" />
                <div className="skeleton mt-2 h-3 w-56 max-w-full" />
              </div>
              <div className="skeleton h-8 w-24 rounded-[var(--radius-control)]" />
            </li>
          ))}
        </ul>
      ) : links.length === 0 ? (
        <div
          className="flex items-center gap-3 rounded-xl p-5"
          style={{ border: "1px dashed var(--rule)", backgroundColor: "var(--parchment)" }}
        >
          <Link2 className="h-4 w-4 shrink-0" style={{ color: "var(--slate)" }} />
          <p style={{ fontSize: "13px", color: "var(--slate)" }}>
            Du har inte delat någon rapport ännu.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link) => {
            const days = daysUntilExpiry(link.expiresAt);
            return (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
                style={{ border: "1px solid var(--rule)" }}
              >
                <div className="min-w-0">
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--charcoal)" }}>
                    {link.workspaceLabel ?? "Rapport"}
                    <span style={{ color: "var(--slate)", fontWeight: 400 }}>
                      {" · "}
                      {formatDate(link.periodStart)} – {formatDate(link.periodEnd)}
                    </span>
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--slate)", marginTop: "2px" }}>
                    Delad {formatDate(link.createdAt)}
                    {link.state === "active" && days !== null && ` · slutar fungera om ${days} dagar`}
                    {link.state === "active" && days === null && " · ingen utgång"}
                    {link.state === "expired" && " · har slutat fungera"}
                    {link.state === "revoked" && ` · återkallad ${formatDate(link.revokedAt)}`}
                  </p>
                </div>

                {link.state === "active" ? (
                  <button
                    type="button"
                    onClick={() => revoke(link.id)}
                    disabled={busyId === link.id}
                    className="btn btn-danger btn-sm shrink-0"
                  >
                    {busyId === link.id ? "Återkallar…" : "Återkalla"}
                  </button>
                ) : (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1"
                    style={{ fontSize: "11px", backgroundColor: "var(--bone-dark)", color: "var(--slate)" }}
                  >
                    {link.state === "revoked" ? "Återkallad" : "Utgången"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
