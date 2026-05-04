import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { type: "auth", message: "You must be signed in." } },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("connected_sources")
    .select("id, source, property_id, display_name, token_expires_at, refresh_token")
    .eq("user_id", user.id)
    .in("source", ["ga4", "gsc"])
    .neq("property_id", "_pending");

  if (error) {
    return NextResponse.json(
      {
        error: {
          type: "database",
          message: "Could not load connected sources.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sources: (data ?? []).map((source) => ({
      id: source.id,
      source: source.source,
      property_id: source.property_id,
      display_name: source.display_name,
      token_expires_at: source.token_expires_at,
      needs_refresh: !source.refresh_token,
    })),
  });
}
