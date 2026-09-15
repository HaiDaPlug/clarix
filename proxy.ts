import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

// Server-side gate for protected pages. `getUser()` validates the session
// against Supabase Auth on every request and transparently refreshes an
// expired access token when the refresh token is still valid; the refreshed
// cookies ride back on `supabaseResponse`.
//
// API routes re-check auth themselves (a Proxy matcher change must never be
// able to expose data), so they are not listed here.

const PROTECTED_PATHS = ["/dashboard", "/integrations", "/clients", "/settings", "/report", "/data"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // A signed-in user has no business on the sign-in screen; bouncing them
  // avoids the "I logged in twice" confusion after a completed OAuth round trip.
  if (user && isAuthPage) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/dashboard";
    appUrl.search = "";
    const redirect = NextResponse.redirect(appUrl);
    // Carry any refreshed session cookies along with the redirect.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
