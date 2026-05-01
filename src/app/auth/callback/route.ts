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
      const { data: sources } = await supabase
        .from("connected_sources")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1);

      const hasConnections = (sources ?? []).length > 0;
      return NextResponse.redirect(`${origin}${hasConnections ? "/dashboard" : "/integrations"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
