"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import type { ClientSourceRef, ClientWorkspace } from "@/lib/clients/types";
import type { GoogleConnectionHealth } from "@/lib/google/connection-types";
import { workspaceNameFromProperty } from "@/lib/clients/naming";
import type { ClientsCopy } from "./copy";

const EASING = [0.16, 1, 0.3, 1] as const;

export type PropertyOption = { id: string; displayName: string };

export type ClientEditorState =
  | { mode: "create" }
  | { mode: "edit"; client: ClientWorkspace };

/** "keep" = leave the current assignment, "none" = remove it, otherwise a property id. */
type SourceChoice = "keep" | "none" | string;

/**
 * Create/edit a workspace: name, domain and its GA4 / GSC property. Property
 * changes go through the sources endpoints, never through the Google grant.
 */
export function ClientEditor({
  state,
  copy,
  googleReady,
  googleHealth,
  options,
  loadingProperties,
  hasActive,
  onClose,
  onSaved,
  onError,
}: {
  state: ClientEditorState;
  copy: ClientsCopy;
  googleReady: boolean;
  googleHealth: GoogleConnectionHealth | null;
  options: Record<"ga4" | "gsc", PropertyOption[]>;
  loadingProperties: boolean;
  hasActive: boolean;
  onClose: () => void;
  onSaved: (client: ClientWorkspace, activated: boolean) => void;
  onError: (message: string) => void;
}) {
  const editing = state.mode === "edit" ? state.client : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [nameTouched, setNameTouched] = useState(Boolean(editing));
  const [domain, setDomain] = useState(editing?.domain ?? "");
  const [ga4, setGa4] = useState<SourceChoice>(editing?.sources.ga4 ? "keep" : "none");
  const [gsc, setGsc] = useState<SourceChoice>(editing?.sources.gsc ? "keep" : "none");
  const [activate, setActivate] = useState(!hasActive || Boolean(editing?.isActive));
  const [saving, setSaving] = useState(false);

  const optionFor = (source: "ga4" | "gsc", id: string) => options[source].find((o) => o.id === id);

  // Creating from a property with no name typed yet: suggest one from it.
  const chooseSource = (source: "ga4" | "gsc", choice: SourceChoice) => {
    (source === "ga4" ? setGa4 : setGsc)(choice);
    if (editing || nameTouched) return;
    if (choice === "keep" || choice === "none") return;
    const option = optionFor(source, choice);
    if (option) setName(workspaceNameFromProperty(option.displayName, option.id));
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const refFor = (source: "ga4" | "gsc", choice: SourceChoice): ClientSourceRef | null | undefined => {
        if (choice === "keep") return undefined;
        if (choice === "none") return null;
        const option = optionFor(source, choice);
        return option ? { propertyId: option.id, displayName: option.displayName } : undefined;
      };

      let client: ClientWorkspace;

      if (!editing) {
        const response = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            domain: domain.trim() || null,
            sources: { ga4: refFor("ga4", ga4) ?? null, gsc: refFor("gsc", gsc) ?? null },
            activate,
          }),
        });
        if (!response.ok) throw new Error(copy.saveFailed);
        client = ((await response.json()) as { client: ClientWorkspace }).client;
      } else {
        const response = await fetch(`/api/clients/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), domain: domain.trim() || null }),
        });
        if (!response.ok) throw new Error(copy.saveFailed);
        client = ((await response.json()) as { client: ClientWorkspace }).client;

        for (const source of ["ga4", "gsc"] as const) {
          const ref = refFor(source, source === "ga4" ? ga4 : gsc);
          if (ref === undefined) continue;
          const res = ref === null
            ? await fetch(`/api/clients/${editing.id}/sources`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source }),
              })
            : await fetch(`/api/clients/${editing.id}/sources`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source, propertyId: ref.propertyId, displayName: ref.displayName }),
              });
          if (!res.ok) throw new Error(copy.saveFailed);
          client = ((await res.json()) as { client: ClientWorkspace }).client;
        }

        if (activate && !client.isActive) {
          const res = await fetch(`/api/clients/${editing.id}/activate`, { method: "POST" });
          if (!res.ok) throw new Error(copy.saveFailed);
          client = { ...client, isActive: true };
        }
      }
      onSaved(client, activate);
    } catch (err) {
      onError(err instanceof Error ? err.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const field: React.CSSProperties = {
    border: "1px solid var(--rule)",
    backgroundColor: "var(--parchment)",
    color: "var(--charcoal)",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25, ease: EASING }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? copy.editorEditTitle : copy.editorCreateTitle}
        className="relative w-full max-w-md rounded-2xl border p-6"
        style={{ backgroundColor: "var(--parchment)", borderColor: "var(--rule)", boxShadow: "0 24px 80px -12px rgba(0,0,0,0.35)" }}
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--charcoal)", letterSpacing: "-0.02em" }}>
            {editing ? copy.editorEditTitle : copy.editorCreateTitle}
          </h2>
          <button type="button" onClick={onClose} aria-label="Stäng" className="rounded-full p-1 transition-colors hover:bg-[var(--rule)]" style={{ color: "var(--slate)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "6px" }}>{copy.nameLabel}</span>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameTouched(true); }}
              placeholder={copy.namePlaceholder}
              required
              maxLength={120}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={field}
            />
          </label>

          <label className="block">
            <span style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "6px" }}>{copy.domainLabel}</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={copy.domainPlaceholder}
              maxLength={253}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={field}
            />
          </label>

          <div className="rounded-xl p-4" style={{ border: "1px solid var(--rule)", backgroundColor: "var(--bone)" }}>
            <p style={{ fontSize: "12px", color: "var(--slate)", lineHeight: 1.5, marginBottom: "12px" }}>
              {googleReady ? copy.sourceHint : copy.googleNotReady}
            </p>
            <SourceSelect
              label={copy.ga4}
              value={ga4}
              onChange={(v) => chooseSource("ga4", v)}
              current={editing?.sources.ga4}
              options={options.ga4}
              disabled={!googleReady}
              loading={loadingProperties}
              copy={copy}
              fieldStyle={field}
            />
            <div className="h-3" />
            <SourceSelect
              label={copy.gsc}
              value={gsc}
              onChange={(v) => chooseSource("gsc", v)}
              current={editing?.sources.gsc}
              options={options.gsc}
              disabled={!googleReady}
              loading={loadingProperties}
              copy={copy}
              fieldStyle={field}
            />
            {googleHealth?.status === "reconnect_required" && (
              <p className="mt-3" style={{ fontSize: "11.5px", color: "#C97B2A" }}>
                {copy.googleReconnect}{" "}
                <Link href="/integrations" className="underline" style={{ color: "var(--charcoal)", fontWeight: 600 }}>
                  {copy.googleReconnectCta}
                </Link>
              </p>
            )}
          </div>

          {!(editing?.isActive) && (
            <label className="flex items-center gap-2.5" style={{ fontSize: "13px", color: "var(--charcoal)" }}>
              <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} className="h-4 w-4" />
              {copy.activateOnSave}
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bone-dark)] disabled:opacity-40"
            style={{ border: "1px solid var(--rule)", color: "var(--charcoal)" }}
          >
            {copy.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--parchment)" }}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function SourceSelect({
  label,
  value,
  onChange,
  current,
  options,
  disabled,
  loading,
  copy,
  fieldStyle,
}: {
  label: string;
  value: SourceChoice;
  onChange: (v: SourceChoice) => void;
  current: ClientSourceRef | undefined;
  options: PropertyOption[];
  disabled: boolean;
  loading: boolean;
  copy: ClientsCopy;
  fieldStyle: React.CSSProperties;
}) {
  return (
    <label className="block">
      <span style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--charcoal)", marginBottom: "6px" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none disabled:opacity-50"
        style={fieldStyle}
      >
        {current && (
          <option value="keep">
            {copy.sourceKeep}: {current.displayName ?? current.propertyId}
          </option>
        )}
        <option value="none">{copy.sourceNone}</option>
        {loading && <option disabled>{copy.loadingProperties}</option>}
        {options
          .filter((o) => o.id !== current?.propertyId)
          .map((o) => (
            <option key={o.id} value={o.id}>
              {o.displayName} — {o.id}
            </option>
          ))}
      </select>
    </label>
  );
}
