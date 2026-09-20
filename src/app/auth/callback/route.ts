import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { describeRequestHosts, logAuthFailure, resolveRequestOrigin } from "@/lib/auth/server";
import { classifyAuthVerification } from "@/lib/auth/verify";
import { sanitizeNextPath } from "@/lib/google/oauth-state";
import { createClient } from "@/utils/supabase/server";

// Clarix sign-in callback (Supabase Auth, PKCE). This is identity only: no
// Google Analytics / Search Console tokens are handled here any more — that
// grant has its own flow under /api/google/oauth/*.
//
// Invariant: the session is established on the host this request arrived
// on, so every redirect below stays on THAT origin. Sending the browser to a
// configured canonical host after the exchange would strand the host-scoped
// session cookies and make the next request look signed out.

type SupabaseServerClient = ReturnType<typeof createClient>;

// A failed exchange can leave a stale/partial PKCE code_verifier (or an old
// chunked session cookie) sitting in the browser, which then blocks the next
// attempt too. Clearing every sb-* cookie whenever we bounce back to /login
// with an error means each retry starts from a clean slate. Only ever done
// when there is NO valid session to protect.
function clearStaleAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.delete(cookie.name);
    }
  }
}

// New accounts go to Integrations to connect Google; returning users go to
// their dashboard. `next` (a relative path) wins when present.
async function destinationFor(supabase: SupabaseServerClient, userId: string, next: string | null): Promise<string> {
  if (next) return next;
  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0 ? "/dashboard" : "/integrations";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = resolveRequestOrigin(request);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"), "") || null;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Structured diagnostics: hosts and outcomes only. Never the code, tokens
  // or cookies.
  const diag: Record<string, unknown> = {
    ...describeRequestHosts(request),
    configuredAppOrigin: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
    redirectOrigin: origin,
    hasCode: Boolean(code),
    hasNext: Boolean(next),
  };
  const log = (outcome: string, extra: Record<string, unknown> = {}) =>
    console.log("[auth/callback]", { outcome, ...diag, ...extra });

  // Google (via Supabase) redirects here with error params when it denies the
  // request before issuing a code (access_denied, account not on the Test
  // Users allowlist while the app is unverified, ...).
  const providerError = searchParams.get("error");
  if (providerError) {
    const detail = searchParams.get("error_description") || providerError;
    console.error(`[auth/callback] provider_denied: ${detail}`);
    log("provider_denied");
    await logAuthFailure(supabase, "provider_denied", detail);
    clearStaleAuthCookies(cookieStore);
    return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=provider_denied`);
  }

  if (code) {
    const {
      data: { session },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session) {
      const destination = await destinationFor(supabase, session.user.id, next);
      log("exchange_ok", { sessionReturned: true, destination });
      return NextResponse.redirect(`${origin}${destination}`);
    }

    // The exchange failed. If the browser already holds a valid session (this
    // is a reload of a callback whose code was consumed a moment ago), the
    // user is signed in — send them on instead of wiping their cookies.
    const {
      data: { user },
      error: verifyError,
    } = await supabase.auth.getUser();
    const verification = classifyAuthVerification(user, verifyError);

    if (verification.state === "authenticated") {
      const destination = await destinationFor(supabase, verification.user.id, next);
      log("exchange_failed_but_session_valid", {
        exchangeError: error?.message ?? "no session returned",
        destination,
      });
      return NextResponse.redirect(`${origin}${destination}`);
    }

    if (verification.state === "error") {
      // Auth itself is unreachable; wiping cookies now could destroy a
      // session we simply could not check. Send the person back to sign in
      // without clearing anything.
      log("exchange_failed_verification_unavailable", { reason: verification.reason });
      return NextResponse.redirect(`${origin}/login?error=auth_unavailable`);
    }

    const detail = error?.message ?? "no session returned";
    const status = error?.status;
    console.error(`[auth/callback] exchange_failed (status ${status ?? "n/a"}): ${detail}`);
    log("exchange_failed", { status: status ?? null, verify: verification.reason });
    await logAuthFailure(supabase, "exchange_failed", detail, status);
    clearStaleAuthCookies(cookieStore);
    return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=exchange_failed`);
  }

  // No code and no provider error. A signed-in user landing here (bookmark,
  // back button) just continues; anyone else is sent to sign in.
  const {
    data: { user },
    error: verifyError,
  } = await supabase.auth.getUser();
  const verification = classifyAuthVerification(user, verifyError);
  if (verification.state === "authenticated") {
    const destination = await destinationFor(supabase, verification.user.id, next);
    log("no_code_session_valid", { destination });
    return NextResponse.redirect(`${origin}${destination}`);
  }
  if (verification.state === "error") {
    log("no_code_verification_unavailable", { reason: verification.reason });
    return NextResponse.redirect(`${origin}/login?error=auth_unavailable`);
  }

  console.error("[auth/callback] no_code: callback hit with no code and no provider error param");
  log("no_code");
  await logAuthFailure(supabase, "no_code", "callback hit with no code and no provider error param");
  clearStaleAuthCookies(cookieStore);
  return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=no_code`);
}
