import { SupabaseClient } from "@supabase/supabase-js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REFRESH_SKEW_MS = 60_000;

type GoogleSource = "ga4" | "gsc";

export async function refreshGoogleToken(
  supabase: SupabaseClient,
  userId: string,
  source: GoogleSource,
  propertyId: string,
  refreshToken: string,
): Promise<string | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(`token_refresh_failed:${body.error ?? res.status}`);
  }

  const json = await res.json() as { access_token?: string; expires_in?: number };
  const newToken = json.access_token;
  if (!newToken) return null;

  const expiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("connected_sources")
    .update({ access_token: newToken, token_expires_at: expiresAt })
    .eq("user_id", userId)
    .eq("source", source)
    .eq("property_id", propertyId);

  if (error) {
    throw new Error("token_refresh_failed:update_failed");
  }

  return newToken;
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string,
  source: GoogleSource,
  propertyId: string,
  // sessionToken kept in signature for backwards compat but intentionally unused.
  // Using the provider_token from the active Supabase session was wrong: it's the
  // token for whoever is currently logged in, not for the stored property owner.
  // Always use the stored access_token / refresh_token instead.
  _sessionToken?: string | undefined,
): Promise<string | null> {

  const { data } = await supabase
    .from("connected_sources")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("source", source)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!data) return null;

  const expiresAtMs = data.token_expires_at
    ? new Date(data.token_expires_at).getTime()
    : Number.NaN;
  const hasKnownValidExpiry =
    data.token_expires_at !== null &&
    !Number.isNaN(expiresAtMs) &&
    expiresAtMs - Date.now() >= REFRESH_SKEW_MS;

  // Token is confirmed still valid — use it directly.
  if (hasKnownValidExpiry) return data.access_token;

  // Try to refresh if we have a refresh token.
  if (data.refresh_token) {
    try {
      return await refreshGoogleToken(supabase, userId, source, propertyId, data.refresh_token);
    } catch {
      throw new Error("token_refresh_failed");
    }
  }

  // No refresh token and expiry unknown — optimistically return the stored
  // access_token and let Google tell us if it's actually expired (401/403).
  // This handles users who connected before refresh tokens were reliably stored.
  if (data.access_token) return data.access_token;

  return null;
}
