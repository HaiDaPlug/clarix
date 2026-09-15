import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logAuthFailure, resolveAppOrigin } from "@/lib/auth/server";
import { sanitizeNextPath } from "@/lib/google/oauth-state";
import { createClient } from "@/utils/supabase/server";

// Clarix sign-in callback (Supabase Auth, PKCE). This is identity only: no
// Google Analytics / Search Console tokens are handled here any more — that
// grant has its own flow under /api/google/oauth/*.

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
  const origin = resolveAppOrigin(request);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"), "") || null;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Google (via Supabase) redirects here with error params when it denies the
  // request before issuing a code (access_denied, account not on the Test
  // Users allowlist while the app is unverified, ...).
  const providerError = searchParams.get("error");
  if (providerError) {
    const detail = searchParams.get("error_description") || providerError;
    console.error(`[auth/callback] provider_denied: ${detail}`);
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
      return NextResponse.redirect(`${origin}${await destinationFor(supabase, session.user.id, next)}`);
    }

    // The exchange failed. If the browser already holds a valid session (this
    // is a reload of a callback whose code was consumed a moment ago), the
    // user is signed in — send them on instead of wiping their cookies.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      console.warn("[auth/callback] exchange failed but a valid session exists; continuing", {
        detail: error?.message ?? "no session returned",
      });
      return NextResponse.redirect(`${origin}${await destinationFor(supabase, user.id, next)}`);
    }

    const detail = error?.message ?? "no session returned";
    const status = error?.status;
    console.error(`[auth/callback] exchange_failed (status ${status ?? "n/a"}): ${detail}`);
    await logAuthFailure(supabase, "exchange_failed", detail, status);
    clearStaleAuthCookies(cookieStore);
    return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=exchange_failed`);
  }

  // No code and no provider error. A signed-in user landing here (bookmark,
  // back button) just continues; anyone else is sent to sign in.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return NextResponse.redirect(`${origin}${await destinationFor(supabase, user.id, next)}`);
  }

  console.error("[auth/callback] no_code: callback hit with no code and no provider error param");
  await logAuthFailure(supabase, "no_code", "callback hit with no code and no provider error param");
  clearStaleAuthCookies(cookieStore);
  return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=no_code`);
}
