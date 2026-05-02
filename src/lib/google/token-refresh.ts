import { SupabaseClient } from "@supabase/supabase-js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function refreshGoogleToken(
  supabase: SupabaseClient,
  userId: string,
  source: "ga4" | "gsc",
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

  await supabase
    .from("connected_sources")
    .update({ access_token: newToken, token_expires_at: expiresAt })
    .eq("user_id", userId)
    .eq("source", source)
    .eq("property_id", propertyId);

  return newToken;
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string,
  source: "ga4" | "gsc",
  propertyId: string,
  sessionToken: string | undefined,
): Promise<string | null> {
  if (sessionToken) return sessionToken;

  const { data } = await supabase
    .from("connected_sources")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("source", source)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (!data) return null;

  const isExpired = data.token_expires_at
    ? new Date(data.token_expires_at).getTime() - Date.now() < 60_000
    : false;

  if (!isExpired) return data.access_token;

  if (!data.refresh_token) return null;

  try {
    return await refreshGoogleToken(supabase, userId, source, propertyId, data.refresh_token);
  } catch {
    throw new Error("token_refresh_failed");
  }
}
