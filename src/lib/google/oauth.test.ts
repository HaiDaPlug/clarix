import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ANALYTICS_SCOPE,
  GOOGLE_SEARCH_CONSOLE_SCOPE,
  buildGoogleAuthorizationUrl,
  classifyGoogleTokenError,
  exchangeGoogleAuthorizationCode,
  missingRequiredScopes,
  parseScopes,
  refreshGoogleAccessToken,
} from "./oauth";

const config = { clientId: "id", clientSecret: "secret" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("classifyGoogleTokenError", () => {
  it("treats 4xx grant errors as permanent and 5xx/429/network as temporary", () => {
    expect(classifyGoogleTokenError(400, "invalid_grant")).toBe("permanent");
    expect(classifyGoogleTokenError(401, "invalid_client")).toBe("permanent");
    expect(classifyGoogleTokenError(500, undefined)).toBe("temporary");
    expect(classifyGoogleTokenError(503, "unavailable")).toBe("temporary");
    expect(classifyGoogleTokenError(429, "rate_limit_exceeded")).toBe("temporary");
    expect(classifyGoogleTokenError(403, "rate_limit_exceeded")).toBe("temporary");
    expect(classifyGoogleTokenError(null, undefined)).toBe("temporary");
  });
});

describe("scopes", () => {
  it("parses and de-duplicates a scope string", () => {
    expect(parseScopes(`${GOOGLE_ANALYTICS_SCOPE}  ${GOOGLE_ANALYTICS_SCOPE} ${GOOGLE_SEARCH_CONSOLE_SCOPE}`)).toEqual([
      GOOGLE_ANALYTICS_SCOPE,
      GOOGLE_SEARCH_CONSOLE_SCOPE,
    ]);
    expect(parseScopes(undefined)).toEqual([]);
  });

  it("reports which required scopes are missing", () => {
    expect(missingRequiredScopes([GOOGLE_ANALYTICS_SCOPE, GOOGLE_SEARCH_CONSOLE_SCOPE])).toEqual([]);
    expect(missingRequiredScopes([GOOGLE_ANALYTICS_SCOPE])).toEqual([GOOGLE_SEARCH_CONSOLE_SCOPE]);
  });
});

describe("buildGoogleAuthorizationUrl", () => {
  it("requests only the two read-only scopes, offline access, consent and S256 PKCE", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({ clientId: "id", redirectUri: "https://x/cb", state: "s", codeChallenge: "c" }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope")).toBe(`${GOOGLE_ANALYTICS_SCOPE} ${GOOGLE_SEARCH_CONSOLE_SCOPE}`);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("c");
    expect(url.searchParams.get("state")).toBe("s");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x/cb");
  });
});

describe("token endpoint calls", () => {
  it("exchanges a code and normalises the token set", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { access_token: "a", refresh_token: "r", expires_in: 3600, scope: `${GOOGLE_ANALYTICS_SCOPE} ${GOOGLE_SEARCH_CONSOLE_SCOPE}` }),
    );
    const result = await exchangeGoogleAuthorizationCode({ config, code: "code", codeVerifier: "v", redirectUri: "https://x/cb", fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tokens.accessToken).toBe("a");
    expect(result.tokens.refreshToken).toBe("r");
    expect(result.tokens.scopes).toHaveLength(2);
    expect(result.tokens.expiresAt).not.toBeNull();

    const body = new URLSearchParams(fetchImpl.mock.calls[0][1].body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toBe("v");
    expect(body.get("client_secret")).toBe("secret");
  });

  it("classifies invalid_grant on refresh as permanent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." }));
    const result = await refreshGoogleAccessToken({ config, refreshToken: "r", fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "permanent", error: "invalid_grant", status: 400 });
  });

  it("classifies a 502 on refresh as temporary", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad gateway", { status: 502 }));
    const result = await refreshGoogleAccessToken({ config, refreshToken: "r", fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "temporary", status: 502 });
  });

  it("classifies a network failure as temporary", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const result = await refreshGoogleAccessToken({ config, refreshToken: "r", fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "temporary", error: "network", status: null });
  });

  it("never leaks the refresh token into warnings", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400, { error: "invalid_grant" }));
    await refreshGoogleAccessToken({ config, refreshToken: "super-secret-refresh", fetchImpl });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain("super-secret-refresh");
    warn.mockRestore();
  });
});
