// PKCE + signed state for the Google integration grant.
//
// The start route puts {state, codeVerifier, userId, next} in an HttpOnly
// cookie signed with an HMAC derived from the OAuth client secret. The callback
// route only trusts a cookie whose signature verifies and whose TTL has not
// passed, and additionally requires the signed-in Clarix user to be the one
// who started the flow. That covers CSRF, code injection (PKCE), stale tabs,
// and a grant landing on the wrong account.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "clarix_google_oauth";
/** How long a started-but-unfinished authorization stays valid. */
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 600;

export type GoogleOAuthStatePayload = {
  state: string;
  codeVerifier: string;
  userId: string;
  /** Relative path to return to after the callback. Already sanitised. */
  next: string;
  /** Epoch milliseconds. */
  issuedAt: number;
};

const DEFAULT_NEXT = "/integrations";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function generateState(): string {
  return base64url(randomBytes(32));
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  // 32 random bytes → 43 base64url chars, inside RFC 7636's 43–128 range.
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/** Never sign with the raw client secret; derive a dedicated key from it. */
export function deriveStateSecret(clientSecret: string): string {
  return createHash("sha256").update(`clarix-google-oauth-state:${clientSecret}`).digest("hex");
}

function sign(data: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(data).digest());
}

export function encodeOAuthState(payload: GoogleOAuthStatePayload, secret: string): string {
  const data = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${data}.${sign(data, secret)}`;
}

/**
 * Returns the payload when the signature verifies and the state is within its
 * TTL, otherwise null. Never throws.
 */
export function decodeOAuthState(
  value: string | null | undefined,
  secret: string,
  now: number = Date.now(),
): GoogleOAuthStatePayload | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;

  const data = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = sign(data, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!isPayload(payload)) return null;
  if (now - payload.issuedAt > GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000) return null;
  if (now < payload.issuedAt - 60_000) return null; // clock skew guard

  return payload;
}

function isPayload(value: unknown): value is GoogleOAuthStatePayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.state === "string" && v.state.length > 0 &&
    typeof v.codeVerifier === "string" && v.codeVerifier.length >= 43 &&
    typeof v.userId === "string" && v.userId.length > 0 &&
    typeof v.next === "string" &&
    typeof v.issuedAt === "number" && Number.isFinite(v.issuedAt)
  );
}

/**
 * Only same-origin relative paths are allowed as a post-callback destination.
 * Anything else (absolute URLs, protocol-relative, backslash tricks) falls back.
 */
export function sanitizeNextPath(next: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (!next) return fallback;
  if (next.length > 512) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  if (next.startsWith("/api/")) return fallback;
  return next;
}

/** Compares two state strings in constant time. */
export function statesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
