import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthedContext, logAuthFailure, resolveAppOrigin } from "@/lib/auth/server";
import {
  getGoogleConnectionStore,
  saveGoogleConnection,
} from "@/lib/google/connection";
import { exchangeGoogleAuthorizationCode, getGoogleOAuthConfig } from "@/lib/google/oauth";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  decodeOAuthState,
  deriveStateSecret,
  sanitizeNextPath,
  statesMatch,
} from "@/lib/google/oauth-state";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const COOKIE_PATH = "/api/google/oauth";

// Completes the Google integration grant. Idempotent: reloading this URL after
// a successful exchange lands on the success page instead of an error, and a
// failure here never touches the user's Clarix (Supabase) session cookies —
// the two are separate concerns.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = resolveAppOrigin(request);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { maxAge: 0, path: COOKIE_PATH });
    return response;
  };

  const redirectTo = (path: string, query: string) =>
    clearStateCookie(NextResponse.redirect(`${origin}${withQuery(path, query)}`));

  const fail = async (next: string, reason: string, detail: string, status?: number | null) => {
    // Human copy is chosen client-side from `reason`; the detail stays server-side.
    console.error(`[google/oauth/callback] ${reason}: ${detail}`);
    await logAuthFailure(supabase, `google_oauth_${reason}`, detail, status);
    return redirectTo(next, `google=error&reason=${encodeURIComponent(reason)}`);
  };

  const config = getGoogleOAuthConfig();
  const payload = config
    ? decodeOAuthState(cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value, deriveStateSecret(config.clientSecret))
    : null;
  const next = sanitizeNextPath(payload?.next);

  const ctx = await getAuthedContext();
  if (!ctx) {
    // Clarix session gone mid-flow. Sign in again; the grant can be retried.
    return clearStateCookie(NextResponse.redirect(`${origin}/login`));
  }

  if (!config) {
    return fail(next, "server_misconfigured", "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
  }

  if (!payload) {
    // Absent, expired, or tampered state cookie — includes a second tab's
    // callback arriving after a newer flow overwrote the cookie.
    return fail(next, "state_missing", "no valid oauth state cookie");
  }

  if (payload.userId !== ctx.user.id) {
    return fail(next, "user_mismatch", "flow started by a different Clarix user");
  }

  const providerError = url.searchParams.get("error");
  if (providerError) {
    if (providerError === "access_denied") {
      console.warn("[google/oauth/callback] user denied consent");
      return redirectTo(next, "google=denied");
    }
    return fail(next, "provider_error", url.searchParams.get("error_description") || providerError);
  }

  const code = url.searchParams.get("code");
  if (!code || !statesMatch(url.searchParams.get("state"), payload.state)) {
    return fail(next, "state_mismatch", code ? "state parameter did not match cookie" : "callback without code");
  }

  const store = getGoogleConnectionStore();
  if (!store) {
    return fail(next, "server_misconfigured", "SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY not configured");
  }

  const result = await exchangeGoogleAuthorizationCode({
    config,
    code,
    codeVerifier: payload.codeVerifier,
    redirectUri: `${origin}/api/google/oauth/callback`,
  });

  if (!result.ok) {
    if (result.kind === "permanent") {
      // A reloaded callback re-sends an already-consumed code, which Google
      // rejects with invalid_grant. If this very flow already produced an
      // active grant, that is a success, not an error.
      const existing = await store.get(ctx.user.id);
      if (existing?.status === "active" && Date.parse(existing.connected_at) >= payload.issuedAt) {
        return redirectTo(next, "google=connected");
      }
    }
    return fail(
      next,
      result.kind === "temporary" ? "google_unavailable" : "exchange_failed",
      `${result.error} (status ${result.status ?? "n/a"})`,
      result.status,
    );
  }

  const health = await saveGoogleConnection(store, ctx.user.id, result.tokens);

  if (health.status !== "connected") {
    // Stored, but unusable (a scope was unchecked, or no refresh token). The
    // UI shows exactly why and offers one calm "connect again".
    console.warn("[google/oauth/callback] grant stored but incomplete", { reason: health.reason, missing: health.missingScopes });
    return redirectTo(next, `google=incomplete&reason=${encodeURIComponent(health.reason ?? "unknown")}`);
  }

  console.log("[google/oauth/callback] connected", { user: ctx.user.id.slice(0, 8) });
  return redirectTo(next, "google=connected");
}

function withQuery(path: string, query: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}
