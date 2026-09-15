import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientWorkspace } from "@/lib/clients/types";
import type { ConnectionDeps, GoogleConnectionRow, GoogleConnectionStore } from "@/lib/google/connection";
import { GOOGLE_ANALYTICS_SCOPE, GOOGLE_SEARCH_CONSOLE_SCOPE, type GoogleTokenResult } from "@/lib/google/oauth";

// ── External boundaries are mocked; the isolation logic under test is real. ──
// vi.mock factories are hoisted, so everything they reference lives in vi.hoisted.

const mocks = vi.hoisted(() => {
  class MockGoogleApiError extends Error {
    constructor(public readonly status: number) {
      super(`Google ${status}`);
      this.name = "GoogleApiError";
    }
  }
  class MockClientNotFoundError extends Error {
    constructor() {
      super("client_not_found");
      this.name = "ClientNotFoundError";
    }
  }
  return {
    MockGoogleApiError,
    MockClientNotFoundError,
    getClientById: vi.fn(),
    fetchGa4ReportSet: vi.fn(),
    fetchGscReportSet: vi.fn(),
  };
});

const { MockGoogleApiError, MockClientNotFoundError } = mocks;
const getClientById = mocks.getClientById as unknown as ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<ClientWorkspace | null>>>;
const fetchGa4ReportSet = mocks.fetchGa4ReportSet;
const fetchGscReportSet = mocks.fetchGscReportSet;

vi.mock("@/lib/clients/server", () => ({
  ClientNotFoundError: mocks.MockClientNotFoundError,
  getClientById: (...args: unknown[]) => mocks.getClientById(...args),
}));

vi.mock("@/lib/google/report-cache", () => ({
  readReportCache: vi.fn().mockResolvedValue(null),
  writeReportCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/google/api-client", () => ({
  GoogleApiError: mocks.MockGoogleApiError,
  fetchGa4ReportSet: (...args: unknown[]) => mocks.fetchGa4ReportSet(...args),
  fetchGscReportSet: (...args: unknown[]) => mocks.fetchGscReportSet(...args),
  fetchGa4TopHostname: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/google/report-mappers", () => ({
  mapGa4Report: ({ current }: { current: { propertyId: string } }) => ({
    trafficOverview: { totalSessions: { value: 100, label: "Besök", unit: "number" }, timeSeries: [], channelBreakdown: [] },
    sourceConfidence: { ga4: { connected: true, property: current.propertyId } },
  }),
  mapGscReport: ({ current }: { current: { siteUrl: string } }) => ({
    seoOverview: { totalClicks: { value: 10, label: "Klick", unit: "number" }, timeSeries: [], topQueries: [] },
    sourceConfidence: { gsc: { connected: true, site: current.siteUrl } },
  }),
}));

vi.mock("@/lib/engine/derive-executive-summary", () => ({
  deriveExecutiveSummary: () => ({ headline: "x", paragraphs: [], highlights: [] }),
}));

import { buildReportDataForUser, sourceRefs } from "./server";

const NOW = Date.parse("2026-09-14T10:00:00.000Z");
const USER = "user-1";
const SCOPES = [GOOGLE_ANALYTICS_SCOPE, GOOGLE_SEARCH_CONSOLE_SCOPE];
const supabase = {} as SupabaseClient;

function workspace(overrides: Partial<ClientWorkspace> = {}): ClientWorkspace {
  return {
    id: "ws-a",
    name: "Alpha",
    domain: "alpha.se",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    sources: {
      ga4: { propertyId: "111", displayName: "Alpha GA4" },
      gsc: { propertyId: "sc-domain:alpha.se", displayName: "alpha.se" },
    },
    ...overrides,
  };
}

function row(overrides: Partial<GoogleConnectionRow> = {}): GoogleConnectionRow {
  return {
    user_id: USER,
    access_token: "access-1",
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
    async get(userId) { return rows.get(userId) ?? null; },
    async upsert(r) { rows.set(r.user_id, r); },
    async update(userId, patch) {
      const current = rows.get(userId);
      if (current) rows.set(userId, { ...current, ...patch } as GoogleConnectionRow);
    },
    async delete(userId) { rows.delete(userId); },
  };
}

const refreshOk = (accessToken: string): GoogleTokenResult => ({
  ok: true,
  tokens: { accessToken, refreshToken: null, expiresAt: new Date(NOW + 3_600_000).toISOString(), scopes: SCOPES },
});

function deps(refresh: ConnectionDeps["refresh"]): ConnectionDeps {
  return { refresh, now: () => NOW };
}

const range = { startDate: "2026-08-01", endDate: "2026-08-31" };

function build(store: GoogleConnectionStore | null, connectionDeps: ConnectionDeps, clientId = "ws-a") {
  return buildReportDataForUser({
    supabase,
    userId: USER,
    clientId,
    dateRange: range,
    periodLabel: "Augusti 2026",
    googleStore: store,
    connectionDeps,
    caller: "test",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchGa4ReportSet.mockImplementation(async ({ propertyId }: { propertyId: string }) => ({ propertyId }));
  fetchGscReportSet.mockImplementation(async ({ siteUrl }: { siteUrl: string }) => ({ siteUrl }));
});

describe("buildReportDataForUser — workspace isolation", () => {
  it("looks up exactly the workspace it was asked for, for the signed-in user", async () => {
    getClientById.mockResolvedValue(workspace());
    await build(memoryStore(row()), deps(vi.fn()), "ws-a");
    expect(getClientById).toHaveBeenCalledWith(supabase, USER, "ws-a");
  });

  it("fetches only the named workspace's properties and stamps its identity on the report", async () => {
    getClientById.mockResolvedValue(workspace());
    const result = await build(memoryStore(row()), deps(vi.fn()));

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.workspace).toEqual({ id: "ws-a", name: "Alpha", domain: "alpha.se" });
    expect(result.sources.map((s) => `${s.source}:${s.propertyId}`)).toEqual(["ga4:111", "gsc:sc-domain:alpha.se"]);

    // Every Google call carried exactly the assigned property ids — nothing else.
    const ga4Ids = new Set(fetchGa4ReportSet.mock.calls.map((c) => c[0].propertyId));
    const gscIds = new Set(fetchGscReportSet.mock.calls.map((c) => c[0].siteUrl));
    expect([...ga4Ids]).toEqual(["111"]);
    expect([...gscIds]).toEqual(["sc-domain:alpha.se"]);

    expect(result.data.meta.clientName).toBe("Alpha");
    expect(result.data.meta.clientDomain).toBe("alpha.se");
    expect(result.data.meta.availableSources.sort()).toEqual(["ga4", "gsc"]);
    expect(result.data.sourceConfidence).toMatchObject({ ga4: { property: "111" }, gsc: { site: "sc-domain:alpha.se" } });
  });

  it("asking for a different workspace changes every property id used", async () => {
    getClientById.mockResolvedValue(
      workspace({ id: "ws-b", name: "Beta", domain: null, sources: { ga4: { propertyId: "222", displayName: null } } }),
    );
    const result = await build(memoryStore(row()), deps(vi.fn()), "ws-b");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(getClientById).toHaveBeenCalledWith(supabase, USER, "ws-b");
    expect(result.workspace.id).toBe("ws-b");
    expect(fetchGa4ReportSet.mock.calls.every((c) => c[0].propertyId === "222")).toBe(true);
    expect(fetchGscReportSet).not.toHaveBeenCalled();
    expect(result.data.meta.availableSources).toEqual(["ga4"]);
    expect(result.data.meta.clientName).toBe("Beta");
  });

  it("refuses a workspace that is not the user's instead of substituting another", async () => {
    getClientById.mockResolvedValue(null);
    await expect(build(memoryStore(row()), deps(vi.fn()), "ws-someone-else")).rejects.toBeInstanceOf(MockClientNotFoundError);
    expect(fetchGa4ReportSet).not.toHaveBeenCalled();
    expect(fetchGscReportSet).not.toHaveBeenCalled();
  });

  it("returns no_sources for a workspace without properties", async () => {
    getClientById.mockResolvedValue(workspace({ sources: {} }));
    const result = await build(memoryStore(row()), deps(vi.fn()));
    expect(result.status).toBe("no_sources");
    expect(fetchGa4ReportSet).not.toHaveBeenCalled();
  });

  it("sourceRefs never yields more than one property per source", () => {
    expect(sourceRefs(workspace()).map((s) => s.source)).toEqual(["ga4", "gsc"]);
  });
});

describe("buildReportDataForUser — grant health", () => {
  it("expired access token + valid refresh token → silent refresh → ok", async () => {
    getClientById.mockResolvedValue(workspace());
    const store = memoryStore(row({ token_expires_at: new Date(NOW - 1000).toISOString() }));
    const refresh = vi.fn().mockResolvedValue(refreshOk("access-2"));
    const result = await build(store, deps(refresh));

    expect(result.status).toBe("ok");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchGa4ReportSet.mock.calls.every((c) => c[0].accessToken === "access-2")).toBe(true);
    expect(result.google.status).toBe("connected");
  });

  it("invalid refresh token → reconnect_required, properties untouched, nothing fetched", async () => {
    getClientById.mockResolvedValue(workspace());
    const store = memoryStore(row({ token_expires_at: new Date(NOW - 1000).toISOString() }));
    const refresh = vi.fn().mockResolvedValue({ ok: false, kind: "permanent", error: "invalid_grant", status: 400 } satisfies GoogleTokenResult);
    const result = await build(store, deps(refresh));

    expect(result.status).toBe("reconnect_required");
    expect(result.google).toMatchObject({ status: "reconnect_required", reason: "invalid_grant" });
    expect(result.sources).toHaveLength(2); // still there — reconnect keeps them
    expect(fetchGa4ReportSet).not.toHaveBeenCalled();
    expect(store.rows.get(USER)!.status).toBe("reconnect_required");
  });

  it("a transient Google 5xx on refresh → unavailable, grant NOT marked", async () => {
    getClientById.mockResolvedValue(workspace());
    const store = memoryStore(row({ token_expires_at: new Date(NOW - 1000).toISOString() }));
    const refresh = vi.fn().mockResolvedValue({ ok: false, kind: "temporary", error: "http_503", status: 503 } satisfies GoogleTokenResult);
    const result = await build(store, deps(refresh));

    expect(result.status).toBe("unavailable");
    expect(result.google).toMatchObject({ status: "error", reason: "google_unavailable" });
    expect(store.rows.get(USER)!.status).toBe("active");
  });

  it("Google 401 on data → one forced refresh → retry succeeds", async () => {
    getClientById.mockResolvedValue(workspace({ sources: { ga4: { propertyId: "111", displayName: null } } }));
    const store = memoryStore(row());
    const refresh = vi.fn().mockResolvedValue(refreshOk("access-2"));
    fetchGa4ReportSet.mockImplementation(async ({ accessToken, propertyId }: { accessToken: string; propertyId: string }) => {
      if (accessToken === "access-1") throw new MockGoogleApiError(401);
      return { propertyId };
    });
    const result = await build(store, deps(refresh));

    expect(result.status).toBe("ok");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.rows.get(USER)!.access_token).toBe("access-2");
  });

  it("Google 401 even with a freshly refreshed token → reconnect_required and persisted", async () => {
    getClientById.mockResolvedValue(workspace({ sources: { ga4: { propertyId: "111", displayName: null } } }));
    const store = memoryStore(row());
    const refresh = vi.fn().mockResolvedValue(refreshOk("access-2"));
    fetchGa4ReportSet.mockRejectedValue(new MockGoogleApiError(401));
    const result = await build(store, deps(refresh));

    expect(result.status).toBe("reconnect_required");
    expect(store.rows.get(USER)).toMatchObject({ status: "reconnect_required", status_reason: "invalid_grant" });
  });

  it("Google 5xx on data → unavailable, not reconnect_required", async () => {
    getClientById.mockResolvedValue(workspace({ sources: { ga4: { propertyId: "111", displayName: null } } }));
    const store = memoryStore(row());
    fetchGa4ReportSet.mockRejectedValue(new MockGoogleApiError(503));
    const result = await build(store, deps(vi.fn()));

    expect(result.status).toBe("unavailable");
    expect(result.google.status).toBe("connected");
    expect(store.rows.get(USER)!.status).toBe("active");
  });

  it("a 403 on one property keeps the other source and reports the failure", async () => {
    getClientById.mockResolvedValue(workspace());
    fetchGscReportSet.mockRejectedValue(new MockGoogleApiError(403));
    const result = await build(memoryStore(row()), deps(vi.fn()));

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.failures).toEqual([{ source: "gsc", propertyId: "sc-domain:alpha.se", reason: "google_403", detail: "HTTP 403" }]);
    expect(result.data.meta.availableSources).toEqual(["ga4"]);
  });

  it("no grant at all → reconnect_required with disconnected health", async () => {
    getClientById.mockResolvedValue(workspace());
    const result = await build(memoryStore(null), deps(vi.fn()));
    expect(result.status).toBe("reconnect_required");
    expect(result.google.status).toBe("disconnected");
  });
});
