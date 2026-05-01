import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

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
        await supabase.from("connected_sources").upsert(
          {
            user_id: session.user.id,
            source: "ga4",
            property_id: "_pending",
            display_name: null,
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token ?? null,
            token_expires_at: expiresAt,
          },
          { onConflict: "user_id,source" },
        );
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
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
