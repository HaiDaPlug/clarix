// The single server-side source of truth for "can Clarix use this user's
// Google grant right now?". Every page and route derives Google status from
// here; nothing else may invent its own meaning of "connected".
//
// Rules:
//   * A row existing is not health. Health is: the access token is fresh, or
//     the refresh token can mint one.
//   * Permanent refresh failures (invalid_grant & co.) mark the row
//     reconnect_required. Temporary ones (5xx, network) mark nothing and
//     surface as "error".
//   * Reconnecting overwrites the credential only. Workspaces/properties live
//     in other tables and are never touched from here.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getGoogleOAuthConfig,
  missingRequiredScopes,
  refreshGoogleAccessToken,
  revokeGoogleToken,
  type GoogleTokenResult,
  type GoogleTokenSet,
} from "./oauth";
import type {
  GoogleConnectionHealth,
  GoogleConnectionReason,
} from "./connection-types";

export type {
  GoogleConnectionHealth,
  GoogleConnectionReason,
  GoogleConnectionStatus,
} from "./connection-types";

/** Refresh this long before the recorded expiry so an in-flight request never carries a token that dies mid-call. */
const REFRESH_SKEW_MS = 60_000;

export type GoogleConnectionRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: "active" | "reconnect_required";
  status_reason: string | null;
  connected_at: string;
  last_refreshed_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
};

export type GoogleConnectionPatch = Partial<Omit<GoogleConnectionRow, "user_id">>;

export interface GoogleConnectionStore {
  get(userId: string): Promise<GoogleConnectionRow | null>;
  upsert(row: GoogleConnectionRow): Promise<void>;
  update(userId: string, patch: GoogleConnectionPatch): Promise<void>;
  delete(userId: string): Promise<void>;
}

export type AccessTokenResult =
  | { ok: true; accessToken: string; health: GoogleConnectionHealth }
  | { ok: false; health: GoogleConnectionHealth };

export type ConnectionDeps = {
  refresh: (refreshToken: string) => Promise<GoogleTokenResult>;
  now: () => number;
};

// ─── stores ──────────────────────────────────────────────────────────────────

const TABLE = "google_connections";
const COLUMNS =
  "user_id, access_token, refresh_token, token_expires_at, scopes, status, status_reason, connected_at, last_refreshed_at, last_error_at, last_error";

export function createSupabaseGoogleConnectionStore(admin: SupabaseClient): GoogleConnectionStore {
  return {
    async get(userId) {
      const { data, error } = await admin
        .from(TABLE)
        .select(COLUMNS)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`google_connections read failed: ${error.message}`);
      return (data as GoogleConnectionRow | null) ?? null;
    },
    async upsert(row) {
      const { error } = await admin.from(TABLE).upsert(row, { onConflict: "user_id" });
      if (error) throw new Error(`google_connections upsert failed: ${error.message}`);
    },
    async update(userId, patch) {
      const { error } = await admin.from(TABLE).update(patch).eq("user_id", userId);
      if (error) throw new Error(`google_connections update failed: ${error.message}`);
    },
    async delete(userId) {
      const { error } = await admin.from(TABLE).delete().eq("user_id", userId);
      if (error) throw new Error(`google_connections delete failed: ${error.message}`);
    },
  };
}

/**
 * The production store, or null when the server lacks the Supabase secret key.
 * Callers turn null into a "server_misconfigured" health instead of throwing.
 */
export function getGoogleConnectionStore(): GoogleConnectionStore | null {
  const admin = createAdminClient();
  return admin ? createSupabaseGoogleConnectionStore(admin) : null;
}

function defaultDeps(): ConnectionDeps | null {
  const config = getGoogleOAuthConfig();
  if (!config) return null;
  return {
    refresh: (refreshToken) => refreshGoogleAccessToken({ config, refreshToken }),
    now: () => Date.now(),
  };
}

// ─── health ──────────────────────────────────────────────────────────────────

export function misconfiguredHealth(now: number = Date.now()): GoogleConnectionHealth {
  return {
    status: "error",
    reason: "server_misconfigured",
    scopes: [],
    missingScopes: [],
    connectedAt: null,
    lastRefreshedAt: null,
    tokenExpiresAt: null,
    checkedAt: new Date(now).toISOString(),
  };
}

function disconnectedHealth(now: number): GoogleConnectionHealth {
  return {
    status: "disconnected",
    reason: "not_connected",
    scopes: [],
    missingScopes: [],
    connectedAt: null,
    lastRefreshedAt: null,
    tokenExpiresAt: null,
    checkedAt: new Date(now).toISOString(),
  };
}

function rowHealth(
  row: GoogleConnectionRow,
  status: GoogleConnectionHealth["status"],
  reason: GoogleConnectionReason | null,
  now: number,
): GoogleConnectionHealth {
  return {
    status,
    reason,
    scopes: row.scopes ?? [],
    missingScopes: row.scopes?.length ? missingRequiredScopes(row.scopes) : [],
    connectedAt: row.connected_at,
    lastRefreshedAt: row.last_refreshed_at,
    tokenExpiresAt: row.token_expires_at,
    checkedAt: new Date(now).toISOString(),
  };
}

function isTokenFresh(row: GoogleConnectionRow, now: number): boolean {
  if (!row.token_expires_at) return false;
  const expiresAt = Date.parse(row.token_expires_at);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - now >= REFRESH_SKEW_MS;
}

// ─── refresh de-duplication ──────────────────────────────────────────────────
// Dashboard, insights and report often hit the same expired token within the
// same second. One refresh per user per process; the rest await it.

const inflightRefreshes = new Map<string, Promise<GoogleTokenResult>>();

function refreshOnce(
  userId: string,
  refreshToken: string,
  deps: ConnectionDeps,
): Promise<GoogleTokenResult> {
  const existing = inflightRefreshes.get(userId);
  if (existing) return existing;

  const promise = deps.refresh(refreshToken).finally(() => {
    if (inflightRefreshes.get(userId) === promise) inflightRefreshes.delete(userId);
  });
  inflightRefreshes.set(userId, promise);
  return promise;
}

// ─── core ────────────────────────────────────────────────────────────────────

/**
 * Returns an access token that is safe to use right now, refreshing when the
 * stored one is (or is about to be) expired. `forceRefresh` bypasses the
 * expiry check — used to verify a grant end-to-end and after Google answered
 * 401 to a token we believed valid.
 */
export async function getGoogleAccessToken(
  store: GoogleConnectionStore | null,
  userId: string,
  options: { forceRefresh?: boolean; deps?: ConnectionDeps } = {},
): Promise<AccessTokenResult> {
  const deps = options.deps ?? defaultDeps();
  const now = (deps ?? { now: () => Date.now() }).now();

  if (!store || !deps) {
    return { ok: false, health: misconfiguredHealth(now) };
  }

  const row = await store.get(userId);
  if (!row) {
    return { ok: false, health: disconnectedHealth(now) };
  }

  // A grant missing one of the two scopes is not "connected" — half the
  // product would 403. Reconnect fixes it; nothing else can.
  if (row.scopes?.length && missingRequiredScopes(row.scopes).length > 0) {
    if (row.status !== "reconnect_required" || row.status_reason !== "missing_scopes") {
      await store.update(userId, { status: "reconnect_required", status_reason: "missing_scopes" });
    }
    return {
      ok: false,
      health: rowHealth({ ...row, status: "reconnect_required" }, "reconnect_required", "missing_scopes", now),
    };
  }

  if (row.status === "reconnect_required") {
    return {
      ok: false,
      health: rowHealth(row, "reconnect_required", reasonFromRow(row), now),
    };
  }

  if (!options.forceRefresh && isTokenFresh(row, now)) {
    return { ok: true, accessToken: row.access_token, health: rowHealth(row, "connected", null, now) };
  }

  if (!row.refresh_token) {
    // Nothing can renew this grant. Even if the access token has minutes left,
    // the honest state is "reconnect required" — say it now, not at 3 a.m.
    await store.update(userId, { status: "reconnect_required", status_reason: "missing_refresh_token" });
    return {
      ok: false,
      health: rowHealth({ ...row, status: "reconnect_required" }, "reconnect_required", "missing_refresh_token", now),
    };
  }

  const result = await refreshOnce(userId, row.refresh_token, deps);
  const refreshedAt = new Date(deps.now()).toISOString();

  if (result.ok) {
    const patch: GoogleConnectionPatch = {
      access_token: result.tokens.accessToken,
      token_expires_at: result.tokens.expiresAt,
      // Google does not rotate refresh tokens on refresh, but honour one if sent.
      refresh_token: result.tokens.refreshToken ?? row.refresh_token,
      scopes: result.tokens.scopes.length > 0 ? result.tokens.scopes : row.scopes,
      last_refreshed_at: refreshedAt,
      last_error: null,
      last_error_at: null,
      status: "active",
      status_reason: null,
    };
    await store.update(userId, patch);
    const updated: GoogleConnectionRow = { ...row, ...patch, refresh_token: patch.refresh_token ?? row.refresh_token, scopes: patch.scopes ?? row.scopes };

    const missing = missingRequiredScopes(updated.scopes);
    if (updated.scopes.length > 0 && missing.length > 0) {
      await store.update(userId, { status: "reconnect_required", status_reason: "missing_scopes" });
      return {
        ok: false,
        health: rowHealth({ ...updated, status: "reconnect_required" }, "reconnect_required", "missing_scopes", deps.now()),
      };
    }

    return { ok: true, accessToken: updated.access_token, health: rowHealth(updated, "connected", null, deps.now()) };
  }

  if (result.kind === "permanent") {
    const patch: GoogleConnectionPatch = {
      status: "reconnect_required",
      status_reason: "invalid_grant",
      last_error: `${result.error} (${result.status ?? "n/a"})`,
      last_error_at: refreshedAt,
    };
    await store.update(userId, patch);
    return {
      ok: false,
      health: rowHealth({ ...row, ...patch, status: "reconnect_required" }, "reconnect_required", "invalid_grant", deps.now()),
    };
  }

  // Temporary: record it for diagnostics, but do NOT touch status.
  await store.update(userId, {
    last_error: `${result.error} (${result.status ?? "n/a"})`,
    last_error_at: refreshedAt,
  });
  return { ok: false, health: rowHealth(row, "error", "google_unavailable", deps.now()) };
}

function reasonFromRow(row: GoogleConnectionRow): GoogleConnectionReason {
  switch (row.status_reason) {
    case "invalid_grant":
    case "missing_refresh_token":
    case "missing_scopes":
      return row.status_reason;
    default:
      return "invalid_grant";
  }
}

/**
 * Health for display. `verify: true` forces a refresh round-trip so the answer
 * reflects Google's opinion of the refresh token right now, not a timestamp.
 */
export async function getGoogleConnectionHealth(
  store: GoogleConnectionStore | null,
  userId: string,
  options: { verify?: boolean; deps?: ConnectionDeps } = {},
): Promise<GoogleConnectionHealth> {
  const result = await getGoogleAccessToken(store, userId, {
    forceRefresh: options.verify === true,
    deps: options.deps,
  });
  return result.health;
}

// ─── writes ──────────────────────────────────────────────────────────────────

/**
 * Stores a freshly granted token set. Keeps an existing refresh token if the
 * new response lacks one, so a reconnect can never downgrade the credential.
 */
export async function saveGoogleConnection(
  store: GoogleConnectionStore,
  userId: string,
  tokens: GoogleTokenSet,
  now: number = Date.now(),
): Promise<GoogleConnectionHealth> {
  const existing = await store.get(userId);
  const refreshToken = tokens.refreshToken ?? existing?.refresh_token ?? null;
  const scopes = tokens.scopes.length > 0 ? tokens.scopes : existing?.scopes ?? [];
  const missing = scopes.length > 0 ? missingRequiredScopes(scopes) : [];

  const status: GoogleConnectionRow["status"] =
    !refreshToken ? "reconnect_required" : missing.length > 0 ? "reconnect_required" : "active";
  const statusReason =
    !refreshToken ? "missing_refresh_token" : missing.length > 0 ? "missing_scopes" : null;

  const row: GoogleConnectionRow = {
    user_id: userId,
    access_token: tokens.accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokens.expiresAt,
    scopes,
    status,
    status_reason: statusReason,
    connected_at: new Date(now).toISOString(),
    last_refreshed_at: new Date(now).toISOString(),
    last_error_at: null,
    last_error: null,
  };
  await store.upsert(row);

  return rowHealth(
    row,
    status === "active" ? "connected" : "reconnect_required",
    statusReason as GoogleConnectionReason | null,
    now,
  );
}

/** Removes the grant. Revokes at Google first (best effort) so the token is dead everywhere. */
export async function disconnectGoogle(
  store: GoogleConnectionStore,
  userId: string,
  options: { revoke?: boolean } = { revoke: true },
): Promise<void> {
  const row = await store.get(userId);
  if (row && options.revoke !== false) {
    await revokeGoogleToken(row.refresh_token ?? row.access_token);
  }
  await store.delete(userId);
}

export type GoogleCallResult<T> =
  | { ok: true; value: T; health: GoogleConnectionHealth }
  | { ok: false; health: GoogleConnectionHealth };

/**
 * Runs a Google API call with a valid access token. If Google rejects the
 * token as unauthorized, the grant is proven with one forced refresh and the
 * call is retried exactly once; a second rejection marks the grant as needing
 * reconnection so the UI stops claiming it works.
 */
export async function withGoogleAccessToken<T>(
  store: GoogleConnectionStore | null,
  userId: string,
  run: (accessToken: string) => Promise<T>,
  isAuthRejection: (error: unknown) => boolean,
  deps?: ConnectionDeps,
): Promise<GoogleCallResult<T>> {
  const first = await getGoogleAccessToken(store, userId, { deps });
  if (!first.ok) return { ok: false, health: first.health };

  try {
    return { ok: true, value: await run(first.accessToken), health: first.health };
  } catch (error) {
    if (!isAuthRejection(error)) throw error;
  }

  const refreshed = await getGoogleAccessToken(store, userId, { forceRefresh: true, deps });
  if (!refreshed.ok) return { ok: false, health: refreshed.health };

  try {
    return { ok: true, value: await run(refreshed.accessToken), health: refreshed.health };
  } catch (error) {
    if (!isAuthRejection(error) || !store) throw error;
    await markGoogleReconnectRequired(store, userId, "invalid_grant", "google_401_after_refresh");
    const after = await getGoogleAccessToken(store, userId, { deps });
    return { ok: false, health: after.health };
  }
}

/**
 * Called by data routes when Google answered 401 even after a forced refresh.
 * Idempotent.
 */
export async function markGoogleReconnectRequired(
  store: GoogleConnectionStore,
  userId: string,
  reason: Extract<GoogleConnectionReason, "invalid_grant" | "missing_refresh_token" | "missing_scopes">,
  detail?: string,
): Promise<void> {
  await store.update(userId, {
    status: "reconnect_required",
    status_reason: reason,
    last_error: detail ?? reason,
    last_error_at: new Date().toISOString(),
  });
}
