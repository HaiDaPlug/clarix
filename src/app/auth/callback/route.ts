import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // The OAuth provider (Google) redirects here directly with its own
  // error/error_description params when it denies the request before
  // ever issuing a code (e.g. access_denied, admin_policy_enforced,
  // account not on the Test Users allowlist while app is unverified).
  const providerError = searchParams.get("error");
  if (providerError) {
    const detail = searchParams.get("error_description") || providerError;
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=provider_denied&detail=${encodeURIComponent(detail)}`,
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && session) {
      // Persist the provider tokens so they're available when the user
      // later visits /integrations (Supabase drops provider_token after
      // the initial exchange). We use property_id="_pending" as a sentinel
      // row that the integrations page reads tokens from before the user
      // has chosen a real property.
      if (session.provider_token) {
        const expiresAt = session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null;
        const { error: upsertError } = await supabase.from("connected_sources").upsert(
          {
            user_id: session.user.id,
            source: "ga4",
            property_id: "_pending",
            display_name: null,
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token ?? null,
            token_expires_at: expiresAt,
          },
          { onConflict: "user_id,source,property_id" },
        );
        if (upsertError) {
          return NextResponse.redirect(`${origin}/login?error=token_save_failed`);
        }
      }

      const { data: sources } = await supabase
        .from("connected_sources")
        .select("id, property_id")
        .eq("user_id", session.user.id);

      const hasRealConnections = (sources ?? []).some(
        (s) => s.property_id !== "_pending",
      );
      return NextResponse.redirect(`${origin}${hasRealConnections ? "/dashboard" : "/integrations"}`);
    }

    // exchangeCodeForSession failed or returned no session — surface why.
    const detail = error?.message ?? "no session returned";
    const status = error?.status ? `&status=${error.status}` : "";
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=exchange_failed&detail=${encodeURIComponent(detail)}${status}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=no_code`);
}
