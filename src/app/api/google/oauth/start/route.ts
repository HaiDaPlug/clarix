import { NextResponse } from "next/server";
import { resolveAppOrigin, resolveRequestOrigin, verifySession } from "@/lib/auth/server";
import { buildGoogleAuthorizationUrl, getGoogleOAuthConfig } from "@/lib/google/oauth";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
  deriveStateSecret,
  encodeOAuthState,
  generatePkcePair,
  generateState,
  sanitizeNextPath,
} from "@/lib/google/oauth-state";

export const dynamic = "force-dynamic";

// Begins the Google Analytics / Search Console authorization for the
// signed-in Clarix user. This never signs anyone in or out of Clarix.
//
// Google requires the redirect URI to match byte-for-byte, so this flow is
// pinned to NEXT_PUBLIC_APP_URL. If the person started on another host
// (apex, preview), the browser is first sent to the pinned host's own
// start URL so the state cookie is written where the callback will read it.
// The Clarix session on the pinned host is what gates the flow there.
export async function GET(request: Request) {
  const requestOrigin = resolveRequestOrigin(request);
  const appOrigin = resolveAppOrigin(request);
  const next = sanitizeNextPath(new URL(request.url).searchParams.get("next"));

  if (appOrigin !== requestOrigin) {
    console.log("[google/oauth/start] canonicalising host before starting", { from: requestOrigin, to: appOrigin });
    return NextResponse.redirect(`${appOrigin}/api/google/oauth/start?next=${encodeURIComponent(next)}`);
  }

  const { verification } = await verifySession();
  if (verification.state === "error") {
    console.warn("[google/oauth/start] auth verification unavailable", { reason: verification.reason });
    return NextResponse.redirect(`${requestOrigin}${withQuery(next, "google=error&reason=auth_unavailable")}`);
  }
  if (verification.state === "unauthenticated") {
    return NextResponse.redirect(`${requestOrigin}/login`);
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    console.error("[google/oauth/start] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
    return NextResponse.redirect(`${requestOrigin}${withQuery(next, "google=error&reason=server_misconfigured")}`);
  }

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const cookieValue = encodeOAuthState(
    { state, codeVerifier: verifier, userId: verification.user.id, next, issuedAt: Date.now() },
    deriveStateSecret(config.clientSecret),
  );

  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId: config.clientId,
    redirectUri: `${appOrigin}/api/google/oauth/callback`,
    state,
    codeChallenge: challenge,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: appOrigin.startsWith("https://"),
    sameSite: "lax",
    // Only the callback needs it — keep it off every other request.
    path: "/api/google/oauth",
    maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS,
  });
  return response;
}

function withQuery(path: string, query: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}
