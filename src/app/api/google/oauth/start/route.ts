import { NextResponse } from "next/server";
import { getAuthedContext, resolveAppOrigin } from "@/lib/auth/server";
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
export async function GET(request: Request) {
  const origin = resolveAppOrigin(request);
  const next = sanitizeNextPath(new URL(request.url).searchParams.get("next"));

  const ctx = await getAuthedContext();
  if (!ctx) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    console.error("[google/oauth/start] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
    return NextResponse.redirect(`${origin}${withQuery(next, "google=error&reason=server_misconfigured")}`);
  }

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const cookieValue = encodeOAuthState(
    { state, codeVerifier: verifier, userId: ctx.user.id, next, issuedAt: Date.now() },
    deriveStateSecret(config.clientSecret),
  );

  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId: config.clientId,
    redirectUri: `${origin}/api/google/oauth/callback`,
    state,
    codeChallenge: challenge,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
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
