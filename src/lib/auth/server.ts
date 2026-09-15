// Small helpers shared by route handlers: resolve the signed-in Clarix user
// (server-validated via getUser, never from an unverified cookie session),
// and the public origin used for OAuth redirect URIs.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export type AuthedContext = { supabase: SupabaseClient; user: User };

export async function getAuthedContext(): Promise<AuthedContext | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

export function unauthorizedJson(): NextResponse {
  return NextResponse.json(
    { error: { type: "auth", message: "You must be signed in." } },
    { status: 401 },
  );
}

/**
 * Google requires the redirect URI to match byte-for-byte, so production
 * should pin it with NEXT_PUBLIC_APP_URL (e.g. https://www.clarix.se). Without
 * it we trust the request's own origin, which is right for local dev and for
 * a single-host deployment.
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
