import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  source: z.enum(["ga4", "gsc"]),
  propertyId: z.string().min(1),
  displayName: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { type: "validation", message: "Invalid connection payload." } },
      { status: 400 },
    );
  }

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

  // provider_token is only available right after OAuth. Fall back to the
  // token stored in the _pending sentinel row written by the auth callback.
  const { data: { session } } = await supabase.auth.getSession();
  let accessToken = session?.provider_token ?? null;
  let refreshToken = session?.provider_refresh_token ?? null;
  let expiresAt = session?.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : null;

  if (!accessToken) {
    // Retry once after a short delay — the auth callback writes the sentinel
    // row asynchronously and may not have committed yet when this route fires.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 800));
      const { data: pending } = await supabase
        .from("connected_sources")
        .select("access_token, refresh_token, token_expires_at")
        .eq("user_id", user.id)
        .eq("source", "ga4")
        .eq("property_id", "_pending")
        .maybeSingle();
      if (pending) {
        accessToken = pending.access_token;
        refreshToken = pending.refresh_token;
        expiresAt = pending.token_expires_at;
        break;
      }
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      {
        error: {
          type: "auth",
          message:
            "Google access is missing. Sign in with Google again before connecting this source.",
        },
      },
      { status: 401 },
    );
  }

  const needsRefresh = !refreshToken;

  const { error } = await supabase.from("connected_sources").upsert(
    {
      user_id: user.id,
      source: parsed.data.source,
      property_id: parsed.data.propertyId,
      display_name: parsed.data.displayName,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
    },
    { onConflict: "user_id,source,property_id" },
  );

  if (error) {
    return NextResponse.json(
      {
        error: {
          type: "database",
          message: "Could not save this connected source.",
        },
      },
      { status: 500 },
    );
  }

  // Clean up the _pending sentinel row now that a real property is connected.
  await supabase
    .from("connected_sources")
    .delete()
    .eq("user_id", user.id)
    .eq("source", parsed.data.source)
    .eq("property_id", "_pending");

  return NextResponse.json({ success: true, needsRefresh });
}
