import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";
import { classifyAuthVerification } from "@/lib/auth/verify";

// Server-side gate for protected pages. `getUser()` validates the session
// against Supabase Auth on every request and transparently refreshes an
// expired access token when the refresh token is still valid; the refreshed
// cookies ride back on `supabaseResponse`, and are copied onto any redirect
// we return instead of it.
//
// Three outcomes, never two:
//   authenticated   → continue (with refreshed cookies)
//   unauthenticated → protected page: one redirect to /login; auth page: continue
//   error           → Supabase Auth could not be reached: continue WITHOUT
//                     redirecting. The person may be signed in; the page and
//                     its API calls decide what to show. Redirecting here
//                     would sign people out on every Auth hiccup.
//
// API routes re-check auth themselves (a Proxy matcher change must never be
// able to expose data), so they are not listed here.

const PROTECTED_PATHS = ["/dashboard", "/integrations", "/clients", "/settings", "/report", "/data"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const verification = classifyAuthVerification(user, error);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  // Diagnostic only (no identity in it): lets a browser's network tab show
  // what the gate decided for a given request.
  supabaseResponse.headers.set("x-clarix-auth", verification.state);

  if (verification.state === "error") {
    console.warn("[proxy] auth verification unavailable; passing through", {
      path: pathname,
      reason: verification.reason,
    });
    return supabaseResponse;
  }

  if (verification.state === "unauthenticated" && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return withCookies(NextResponse.redirect(loginUrl), supabaseResponse);
  }

  // A signed-in user has no business on the sign-in screen; bouncing them
  // avoids the "I logged in twice" confusion after a completed OAuth round trip.
  if (verification.state === "authenticated" && isAuthPage) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/dashboard";
    appUrl.search = "";
    return withCookies(NextResponse.redirect(appUrl), supabaseResponse);
  }

  return supabaseResponse;
}

// Any cookies Supabase refreshed during this request must survive a redirect,
// or the next request arrives with the stale token and gets bounced again.
function withCookies(redirect: NextResponse, from: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  redirect.headers.set("x-clarix-auth", from.headers.get("x-clarix-auth") ?? "");
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
