// Shared by route handlers: resolve the signed-in Clarix user with the
// server-validated getUser() call, and give each request its answer in one
// of THREE states — authenticated, unauthenticated, or "could not verify".
// A Supabase Auth outage must never look like a logout.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { classifyAuthVerification, type AuthVerification } from "./verify";

export { resolveRequestOrigin, describeRequestHosts } from "./verify";

export type AuthedContext = { ok: true; supabase: SupabaseClient; user: User };
export type AuthRefused = { ok: false; state: "unauthenticated" | "error"; response: NextResponse };

/** Low-level: the SSR client plus the classified verification result. */
export async function verifySession(): Promise<{ supabase: SupabaseClient; verification: AuthVerification }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, verification: classifyAuthVerification(user, error) };
}

/**
 * For JSON routes. Unauthenticated → 401 (the page sends the person to
 * sign in). Verification error → 503 `auth_unavailable` (the page shows a
 * retry state and keeps the session cookies untouched).
 */
export async function requireUser(): Promise<AuthedContext | AuthRefused> {
  const { supabase, verification } = await verifySession();
  if (verification.state === "authenticated") {
    return { ok: true, supabase, user: verification.user };
  }
  if (verification.state === "error") {
    console.warn("[auth] verification unavailable", { reason: verification.reason });
    return { ok: false, state: "error", response: authUnavailableJson() };
  }
  return { ok: false, state: "unauthenticated", response: unauthorizedJson() };
}

export function unauthorizedJson(): NextResponse {
  return NextResponse.json(
    { error: { type: "auth", message: "You must be signed in." } },
    { status: 401 },
  );
}

export function authUnavailableJson(): NextResponse {
  return NextResponse.json(
    { error: { type: "auth_unavailable", message: "Could not verify your session right now. Try again." } },
    { status: 503, headers: { "Retry-After": "5" } },
  );
}

/**
 * The pinned public origin for the Google DATA grant only, where Google
 * requires the redirect URI to match byte-for-byte. Never use this for
 * Clarix identity redirects — those must stay on the host that holds the
 * session cookies (see resolveRequestOrigin).
 */
export function resolveAppOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to the request origin
    }
  }
  return new URL(request.url).origin;
}

/**
 * Best-effort persistence of auth/OAuth failures for diagnosis from the
 * Supabase dashboard. Never throws, never blocks the response.
 */
export async function logAuthFailure(
  supabase: SupabaseClient,
  reason: string,
  detail: string,
  status?: number | null,
): Promise<void> {
  try {
    const { error } = await supabase.from("auth_failures").insert({
      reason,
      detail: detail.slice(0, 1000),
      status: status ?? null,
    });
    if (error) console.error(`[auth] failed to log auth failure: ${error.message}`);
  } catch (err) {
    console.error("[auth] failed to log auth failure", err instanceof Error ? err.message : String(err));
  }
}
