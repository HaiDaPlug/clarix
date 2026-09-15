import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS, so every query made with it MUST filter on
// the authenticated user's id explicitly. Only used for tables that carry
// credentials the browser must never be able to read (google_connections).
//
// Accepts the new-style secret key (sb_secret_...) or the legacy service-role
// JWT. Returns null when neither is configured so callers can degrade to an
// explicit "server misconfigured" state instead of throwing at import time.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function getSupabaseSecretKey(): string | null {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

let cachedAdminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must only be called on the server.");
  }

  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) return null;

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return cachedAdminClient;
}
