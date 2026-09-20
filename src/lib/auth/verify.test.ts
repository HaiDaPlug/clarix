import { describe, expect, it } from "vitest";
import type { AuthError, User } from "@supabase/supabase-js";
import { classifyAuthVerification, describeRequestHosts, resolveRequestOrigin } from "./verify";

function authError(name: string, status?: number): AuthError {
  const err = new Error(name) as AuthError & { status?: number };
  err.name = name;
  err.status = status;
  return err;
}

const user = { id: "u1" } as User;

describe("classifyAuthVerification", () => {
  it("is authenticated when a user comes back", () => {
    expect(classifyAuthVerification(user, null)).toEqual({ state: "authenticated", user });
  });

  it("is unauthenticated with no user and no error", () => {
    expect(classifyAuthVerification(null, null).state).toBe("unauthenticated");
  });

  it("treats a missing session as unauthenticated", () => {
    expect(classifyAuthVerification(null, authError("AuthSessionMissingError", 400)).state).toBe("unauthenticated");
  });

  it("treats 4xx Auth answers (dead refresh token, revoked session) as unauthenticated", () => {
    expect(classifyAuthVerification(null, authError("AuthApiError", 400)).state).toBe("unauthenticated");
    expect(classifyAuthVerification(null, authError("AuthApiError", 401)).state).toBe("unauthenticated");
    expect(classifyAuthVerification(null, authError("AuthApiError", 403)).state).toBe("unauthenticated");
  });

  it("never reports a transport or 5xx failure as signed out", () => {
    expect(classifyAuthVerification(null, authError("AuthRetryableFetchError", 503)).state).toBe("error");
    expect(classifyAuthVerification(null, authError("AuthRetryableFetchError", 0)).state).toBe("error");
    expect(classifyAuthVerification(null, authError("AuthApiError", 502)).state).toBe("error");
    expect(classifyAuthVerification(null, authError("AuthUnknownError")).state).toBe("error");
  });
});

describe("resolveRequestOrigin", () => {
  it("uses the request URL when nothing is forwarded (localhost)", () => {
    const req = new Request("http://localhost:3000/auth/callback?code=x");
    expect(resolveRequestOrigin(req)).toBe("http://localhost:3000");
  });

  it("ignores forwarded headers on localhost so a stray production env cannot redirect dev away", () => {
    const req = new Request("http://localhost:3000/auth/callback", {
      headers: { "x-forwarded-host": "www.clarix.se", "x-forwarded-proto": "https" },
    });
    expect(resolveRequestOrigin(req)).toBe("http://localhost:3000");
  });

  it("uses the forwarded host and proto behind a proxy", () => {
    const req = new Request("http://10.0.0.1:3000/auth/callback", {
      headers: { "x-forwarded-host": "www.clarix.se", "x-forwarded-proto": "https" },
    });
    expect(resolveRequestOrigin(req)).toBe("https://www.clarix.se");
  });

  it("keeps the apex host if that is where the person is", () => {
    const req = new Request("https://clarix.se/auth/callback", {
      headers: { "x-forwarded-host": "clarix.se", "x-forwarded-proto": "https" },
    });
    expect(resolveRequestOrigin(req)).toBe("https://clarix.se");
  });

  it("keeps a Vercel preview host", () => {
    const req = new Request("https://clarix-git-branch-team.vercel.app/auth/callback", {
      headers: { "x-forwarded-host": "clarix-git-branch-team.vercel.app", "x-forwarded-proto": "https" },
    });
    expect(resolveRequestOrigin(req)).toBe("https://clarix-git-branch-team.vercel.app");
  });

  it("takes the first value of a comma-separated forwarded header", () => {
    const req = new Request("https://internal/auth/callback", {
      headers: { "x-forwarded-host": "www.clarix.se, proxy.internal", "x-forwarded-proto": "https, http" },
    });
    expect(resolveRequestOrigin(req)).toBe("https://www.clarix.se");
  });

  it("describes hosts without leaking anything else", () => {
    const req = new Request("https://www.clarix.se/auth/callback?code=secret", {
      headers: { host: "www.clarix.se" },
    });
    const d = describeRequestHosts(req);
    expect(d.requestOrigin).toBe("https://www.clarix.se");
    expect(JSON.stringify(d)).not.toContain("secret");
  });
});
