import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ConnectionDeps,
  type GoogleConnectionRow,
  type GoogleConnectionStore,
  getGoogleAccessToken,
  getGoogleConnectionHealth,
  saveGoogleConnection,
  withGoogleAccessToken,
} from "./connection";
import { GOOGLE_ANALYTICS_SCOPE, GOOGLE_SEARCH_CONSOLE_SCOPE, type GoogleTokenResult } from "./oauth";

const NOW = Date.parse("2026-09-14T10:00:00.000Z");
const USER = "user-1";
const SCOPES = [GOOGLE_ANALYTICS_SCOPE, GOOGLE_SEARCH_CONSOLE_SCOPE];

function row(overrides: Partial<GoogleConnectionRow> = {}): GoogleConnectionRow {
  return {
    user_id: USER,
    access_token: "access-old",
    refresh_token: "refresh-1",
    token_expires_at: new Date(NOW + 30 * 60_000).toISOString(),
    scopes: SCOPES,
    status: "active",
    status_reason: null,
    connected_at: new Date(NOW - 86_400_000).toISOString(),
    last_refreshed_at: null,
    last_error_at: null,
    last_error: null,
    ...overrides,
  };
}

function memoryStore(initial: GoogleConnectionRow | null): GoogleConnectionStore & { rows: Map<string, GoogleConnectionRow> } {
  const rows = new Map<string, GoogleConnectionRow>();
  if (initial) rows.set(initial.user_id, initial);
  return {
    rows,
    async get(userId) {
      return rows.get(userId) ?? null;
    },
    async upsert(r) {
      rows.set(r.user_id, r);
    },
    async update(userId, patch) {
      const current = rows.get(userId);
      if (current) rows.set(userId, { ...current, ...patch } as GoogleConnectionRow);
    },
    async delete(userId) {
      rows.delete(userId);
    },
  };
}

function deps(refresh: ConnectionDeps["refresh"]): ConnectionDeps {
  return { refresh, now: () => NOW };
}

const refreshOk = (accessToken = "access-new"): GoogleTokenResult => ({
  ok: true,
  tokens: { accessToken, refreshToken: null, expiresAt: new Date(NOW + 3_600_000).toISOString(), scopes: SCOPES },
});

const refreshInvalidGrant: GoogleTokenResult = { ok: false, kind: "permanent", error: "invalid_grant", status: 400 };
const refreshServerDown: GoogleTokenResult = { ok: false, kind: "temporary", error: "http_502", status: 502 };

describe("getGoogleAccessToken", () => {
  it("is disconnected when no grant exists", async () => {
    const result = await getGoogleAccessToken(memoryStore(null), USER, { deps: deps(vi.fn()) });
    expect(result.ok).toBe(false);
    expect(result.health.status).toBe("disconnected");
  });

  it("reports server_misconfigured without a store", async () => {
    const result = await getGoogleAccessToken(null, USER, { deps: deps(vi.fn()) });
    expect(result.ok).toBe(false);
    expect(result.health).toMatchObject({ status: "error", reason: "server_misconfigured" });
  });

  it("uses a fresh access token without calling Google", async () => {
    const refresh = vi.fn();
    const result = await getGoogleAccessToken(memoryStore(row()), USER, { deps: deps(refresh) });
    expect(result).toMatchObject({ ok: true, accessToken: "access-old" });
    expect(result.health.status).toBe("connected");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("silently refreshes an expired token and stays connected", async () => {
    const store = memoryStore(row({ token_expires_at: new Date(NOW - 1000).toISOString() }));
    const refresh = vi.fn().mockResolvedValue(refreshOk());
    const result = await getGoogleAccessToken(store, USER, { deps: deps(refresh) });
    expect(result).toMatchObject({ ok: true, accessToken: "access-new" });
    expect(result.health.status).toBe("connected");
    expect(refresh).toHaveBeenCalledWith("refresh-1");
    const persisted = store.rows.get(USER)!;
    expect(persisted.access_token).toBe("access-new");
    expect(persisted.status).toBe("active");
    expect(persisted.last_refreshed_at).toBe(new Date(NOW).toISOString());
  });

  it("refreshes when the token is within the skew window", async () => {
    const store = memoryStore(row({ token_expires_at: new Date(NOW + 30_000).toISOString() }));
    const refresh = vi.fn().mockResolvedValue(refreshOk());
    const result = await getGoogleAccessToken(store, USER, { deps: deps(refresh) });
    expect(result.ok).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("marks reconnect_required and persists it on invalid_grant", async () => {
    const store = memoryStore(row({ token_expires_at: new Date(NOW - 1000).toISOString() }));
    const result = await getGoogleAccessToken(store, USER, { deps: deps(vi.fn().mockResolvedValue(refreshInvalidGrant)) });
    expect(result.ok).toBe(false);
    expect(result.health).toMatchObject({ status: "reconnect_required", reason: "invalid_grant" });
    const persisted = store.rows.get(USER)!;
    expect(persisted.status).toBe("reconnect_required");
    expect(persisted.status_reason).toBe("invalid_grant");
    expect(persisted.last_error).toContain("invalid_grant");
  });

  it("does NOT mark the grant on a temporary Google failure", async () => {
    const store = memoryStore(row({ token_expires_at: new Date(NOW - 1000).toISOString() }));
    const result = await getGoogleAccessToken(store, USER, { deps: deps(vi.fn().mockResolvedValue(refreshServerDown)) });
    expect(result.ok).toBe(false);
    expect(result.health).toMatchObject({ status: "error", reason: "google_unavailable" });
    const persisted = store.rows.get(USER)!;
    expect(persisted.status).toBe("active");
    expect(persisted.last_error).toContain("502");
  });

  it("short-circuits a grant already marked reconnect_required without calling Google", async () => {
    const refresh = vi.fn();
    const store = memoryStore(row({ status: "reconnect_required", status_reason: "invalid_grant" }));
    const result = await getGoogleAccessToken(store, USER, { deps: deps(refresh) });
    expect(result.ok).toBe(false);
    expect(result.health).toMatchObject({ status: "reconnect_required", reason: "invalid_grant" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("treats a missing refresh token as reconnect_required once the access token expires", async () => {
    const store = memoryStore(row({ refresh_token: null, token_expires_at: new Date(NOW - 1000).toISOString() }));
    const result = await getGoogleAccessToken(store, USER, { deps: deps(vi.fn()) });
    expect(result.ok).toBe(false);
    expect(result.health).toMatchObject({ status: "reconnect_required", reason: "missing_refresh_token" });
    expect(store.rows.get(USER)!.status).toBe("reconnect_required");
  });

  it("treats a grant missing one required scope as reconnect_required", async () => {
    const store = memoryStore(row({ scopes: [GOOGLE_ANALYTICS_SCOPE] }));
    const result = await getGoogleAccessToken(store, USER, { deps: deps(vi.fn()) });
    expect(result.ok).toBe(false);
    expect(result.health).toMatchObject({ status: "reconnect_required", reason: "missing_scopes" });
    expect(result.health.missingScopes).toEqual([GOOGLE_SEARCH_CONSOLE_SCOPE]);
  });

  it("forceRefresh proves the grant even when the access token looks fresh", async () => {
    const store = memoryStore(row());
    const result = await getGoogleAccessToken(store, USER, {
      forceRefresh: true,
      deps: deps(vi.fn().mockResolvedValue(refreshInvalidGrant)),
    });
    expect(result.ok).toBe(false);
    expect(result.health.status).toBe("reconnect_required");
  });

  it("de-duplicates concurrent refreshes for the same user", async () => {
    // Own user id: the de-dupe map is process-wide, so a dangling promise
    // here must never be able to stall another test.
    const user = "user-dedupe";
    const store = memoryStore(row({ user_id: user, token_expires_at: new Date(NOW - 1000).toISOString() }));
    let resolve: ((value: GoogleTokenResult) => void) | null = null;
    const refresh = vi.fn().mockImplementation(() => new Promise<GoogleTokenResult>((r) => { resolve = r; }));
    const d = deps(refresh);
    const a = getGoogleAccessToken(store, user, { deps: d });
    const b = getGoogleAccessToken(store, user, { deps: d });
    // Let both calls get past their store reads and into the refresh.
    await new Promise((r) => setTimeout(r, 0));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(resolve).not.toBeNull();
    resolve!(refreshOk());
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.ok && rb.ok).toBe(true);
  });
});

describe("getGoogleConnectionHealth", () => {
  it("verify=true forces a round-trip; verify=false trusts a fresh expiry", async () => {
    const refresh = vi.fn().mockResolvedValue(refreshOk());
    const store = memoryStore(row());
    expect((await getGoogleConnectionHealth(store, USER, { deps: deps(refresh) })).status).toBe("connected");
    expect(refresh).not.toHaveBeenCalled();
    expect((await getGoogleConnectionHealth(store, USER, { verify: true, deps: deps(refresh) })).status).toBe("connected");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("saveGoogleConnection", () => {
  it("keeps an existing refresh token when the new grant lacks one", async () => {
    const store = memoryStore(row({ refresh_token: "refresh-old" }));
    const health = await saveGoogleConnection(store, USER, {
      accessToken: "access-new",
      refreshToken: null,
      expiresAt: new Date(NOW + 3_600_000).toISOString(),
      scopes: SCOPES,
    }, NOW);
    expect(health.status).toBe("connected");
    expect(store.rows.get(USER)!.refresh_token).toBe("refresh-old");
  });

  it("stores a grant with a missing scope as reconnect_required", async () => {
    const store = memoryStore(null);
    const health = await saveGoogleConnection(store, USER, {
      accessToken: "a",
      refreshToken: "r",
      expiresAt: null,
      scopes: [GOOGLE_SEARCH_CONSOLE_SCOPE],
    }, NOW);
    expect(health).toMatchObject({ status: "reconnect_required", reason: "missing_scopes" });
  });

  it("clears a previous reconnect_required state on a fresh grant", async () => {
    const store = memoryStore(row({ status: "reconnect_required", status_reason: "invalid_grant" }));
    const health = await saveGoogleConnection(store, USER, {
      accessToken: "a",
      refreshToken: "r2",
      expiresAt: null,
      scopes: SCOPES,
    }, NOW);
    expect(health.status).toBe("connected");
    expect(store.rows.get(USER)).toMatchObject({ status: "active", status_reason: null, refresh_token: "r2" });
  });
});

describe("withGoogleAccessToken", () => {
  class AuthRejected extends Error {}
  const isAuth = (e: unknown) => e instanceof AuthRejected;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retries exactly once after a 401 with a refreshed token", async () => {
    const store = memoryStore(row());
    const refresh = vi.fn().mockResolvedValue(refreshOk("access-2"));
    const run = vi.fn()
      .mockRejectedValueOnce(new AuthRejected("401"))
      .mockResolvedValueOnce("data");
    const result = await withGoogleAccessToken(store, USER, run, isAuth, deps(refresh));
    expect(result).toMatchObject({ ok: true, value: "data" });
    expect(run).toHaveBeenNthCalledWith(1, "access-old");
    expect(run).toHaveBeenNthCalledWith(2, "access-2");
  });

  it("marks reconnect_required when a freshly refreshed token is rejected too", async () => {
    const store = memoryStore(row());
    const refresh = vi.fn().mockResolvedValue(refreshOk("access-2"));
    const run = vi.fn().mockRejectedValue(new AuthRejected("401"));
    const result = await withGoogleAccessToken(store, USER, run, isAuth, deps(refresh));
    expect(result.ok).toBe(false);
    expect(result.health.status).toBe("reconnect_required");
    expect(store.rows.get(USER)!.status).toBe("reconnect_required");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("propagates non-auth errors untouched", async () => {
    const store = memoryStore(row());
    const run = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(withGoogleAccessToken(store, USER, run, isAuth, deps(vi.fn()))).rejects.toThrow("boom");
    expect(store.rows.get(USER)!.status).toBe("active");
  });
});
