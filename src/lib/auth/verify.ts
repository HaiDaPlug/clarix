// Pure helpers for the Clarix identity boundary. No Next.js imports so they
// can be unit-tested and reused by the proxy and route handlers alike.

import type { AuthError, User } from "@supabase/supabase-js";

/**
 * Three states, never two. "error" means Supabase Auth could not be reached
 * or answered 5xx — the person may well be signed in, so it must never be
 * reported as "you need to log in".
 */
export type AuthVerification =
  | { state: "authenticated"; user: User }
  | { state: "unauthenticated"; reason: string }
  | { state: "error"; reason: string };

export function classifyAuthVerification(user: User | null, error: AuthError | null): AuthVerification {
  if (user) return { state: "authenticated", user };
  if (!error) return { state: "unauthenticated", reason: "no_session" };

  const name = error.name ?? "";
  const status = typeof error.status === "number" ? error.status : null;

  // No cookies / no session at all: the normal signed-out case.
  if (name === "AuthSessionMissingError") return { state: "unauthenticated", reason: "session_missing" };

  // Transport failure or Auth server failure: verification did not happen.
  if (name === "AuthRetryableFetchError" || status === null || status === 0 || status >= 500) {
    return { state: "error", reason: `${name || "auth_error"}${status ? ` ${status}` : ""}` };
  }

  // 4xx from Auth (invalid/expired/consumed refresh token, revoked session,
  // bad JWT): the session genuinely cannot be used.
  return { state: "unauthenticated", reason: `${name || "auth_error"} ${status}` };
}

/**
 * The origin the browser is actually on, for redirects that must land on the
 * SAME host that holds the session cookies. Behind a proxy (Vercel) the
 * public host arrives in x-forwarded-host; locally the request URL is right.
 * This is the Supabase-recommended shape for OAuth callbacks.
 */
export function resolveRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = firstValue(request.headers.get("x-forwarded-host"));
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!forwardedHost || isLocal) return url.origin;
  const forwardedProto = firstValue(request.headers.get("x-forwarded-proto")) ?? url.protocol.replace(":", "");
  return `${forwardedProto}://${forwardedHost}`;
}

function firstValue(header: string | null): string | null {
  const value = header?.split(",")[0]?.trim();
  return value ? value : null;
}

/** Diagnostic fields safe to log: hosts only, never tokens, codes or cookies. */
export function describeRequestHosts(request: Request): {
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
  requestOrigin: string;
} {
  return {
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    requestOrigin: resolveRequestOrigin(request),
  };
}
