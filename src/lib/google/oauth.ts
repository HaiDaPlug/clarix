// Google OAuth 2.0 HTTP helpers for the Analytics / Search Console grant.
//
// This is the integration grant, NOT Clarix sign-in. Clarix sign-in stays with
// Supabase Auth; this module talks to Google directly with our own OAuth client
// (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET), so the client that issues a
// refresh token is always the client that later refreshes it.
//
// Never log token values. Log error codes and HTTP statuses only.

export const GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
export const GOOGLE_SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

/** The only scopes Clarix ever requests. Do not broaden without re-verification. */
export const GOOGLE_REQUIRED_SCOPES: readonly string[] = [
  GOOGLE_ANALYTICS_SCOPE,
  GOOGLE_SEARCH_CONSOLE_SCOPE,
];

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export type GoogleTokenSet = {
  accessToken: string;
  /** Null when Google did not return one (only happens without prompt=consent). */
  refreshToken: string | null;
  /** ISO timestamp, null when Google omitted expires_in. */
  expiresAt: string | null;
  /** Scopes Google says were granted; empty when the response omitted them. */
  scopes: string[];
};

export type GoogleTokenFailure = {
  ok: false;
  /**
   * permanent — the grant is dead (invalid_grant, invalid_client, ...). The
   *             user has to authorize again.
   * temporary — Google or the network hiccupped (5xx, 429, fetch error). Try
   *             again later; nothing about the grant should be marked.
   */
  kind: "permanent" | "temporary";
  /** Google's error code, or "network" / "invalid_response". */
  error: string;
  status: number | null;
};

export type GoogleTokenResult = { ok: true; tokens: GoogleTokenSet } | GoogleTokenFailure;

type FetchLike = typeof fetch;

export function parseScopes(scope: string | null | undefined): string[] {
  if (!scope) return [];
  return Array.from(new Set(scope.split(/\s+/).map((s) => s.trim()).filter(Boolean)));
}

/** Which of the scopes Clarix needs are absent from a granted list. */
export function missingRequiredScopes(granted: readonly string[]): string[] {
  const set = new Set(granted);
  return GOOGLE_REQUIRED_SCOPES.filter((scope) => !set.has(scope));
}

/**
 * Splits token-endpoint failures into "the grant is gone" and "try again".
 * 4xx from the token endpoint is about the credentials we sent; 5xx/429 and
 * transport errors say nothing about the grant.
 */
export function classifyGoogleTokenError(status: number | null, errorCode: string | undefined): "permanent" | "temporary" {
  if (status === null) return "temporary";
  if (status >= 500) return "temporary";
  if (status === 429) return "temporary";
  if (status === 403 && (errorCode ?? "").toLowerCase().includes("rate")) return "temporary";
  return "permanent";
}

export function buildGoogleAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_REQUIRED_SCOPES.join(" "));
  // offline + consent: guarantees a refresh token on every authorization, not
  // only the first one. Without consent Google omits refresh_token on re-auth.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeGoogleAuthorizationCode(params: {
  config: GoogleOAuthConfig;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  fetchImpl?: FetchLike;
}): Promise<GoogleTokenResult> {
  return requestTokens(
    {
      client_id: params.config.clientId,
      client_secret: params.config.clientSecret,
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    },
    params.fetchImpl ?? fetch,
  );
}

export async function refreshGoogleAccessToken(params: {
  config: GoogleOAuthConfig;
  refreshToken: string;
  fetchImpl?: FetchLike;
}): Promise<GoogleTokenResult> {
  return requestTokens(
    {
      client_id: params.config.clientId,
      client_secret: params.config.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: "refresh_token",
    },
    params.fetchImpl ?? fetch,
  );
}

/** Best-effort revocation at Google. Failures are logged, never thrown. */
export async function revokeGoogleToken(token: string, fetchImpl: FetchLike = fetch): Promise<void> {
  try {
    const res = await fetchImpl(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[google/oauth] revoke returned ${res.status}`);
    }
  } catch (err) {
    console.warn("[google/oauth] revoke failed", err instanceof Error ? err.message : String(err));
  }
}

async function requestTokens(
  body: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<GoogleTokenResult> {
  let res: Response;
  try {
    res = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[google/oauth] token request failed (network)", err instanceof Error ? err.message : String(err));
    return { ok: false, kind: "temporary", error: "network", status: null };
  }

  let json: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const error = json.error ?? `http_${res.status}`;
    const kind = classifyGoogleTokenError(res.status, error);
    console.warn(`[google/oauth] token endpoint ${res.status} ${error} (${kind})`, {
      grant: body.grant_type,
      description: json.error_description ?? null,
    });
    return { ok: false, kind, error, status: res.status };
  }

  if (!json.access_token) {
    console.warn("[google/oauth] token endpoint returned no access_token", { grant: body.grant_type });
    return { ok: false, kind: "temporary", error: "invalid_response", status: res.status };
  }

  const expiresAt =
    typeof json.expires_in === "number" && Number.isFinite(json.expires_in)
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null;

  return {
    ok: true,
    tokens: {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt,
      scopes: parseScopes(json.scope),
    },
  };
}
