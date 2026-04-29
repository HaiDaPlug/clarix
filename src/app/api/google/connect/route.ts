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
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.provider_token;

  if (!session?.user || !accessToken) {
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

  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : null;

  // Provider tokens are short-lived. A future pass should refresh with
  // provider_refresh_token server-side before expiry instead of relying on
  // a fresh browser session.
  const needsRefresh = !session.provider_refresh_token;

  const { error } = await supabase.from("connected_sources").upsert(
    {
      user_id: session.user.id,
      source: parsed.data.source,
      property_id: parsed.data.propertyId,
      display_name: parsed.data.displayName,
      access_token: accessToken,
      refresh_token: session.provider_refresh_token ?? null,
      token_expires_at: expiresAt,
    },
    { onConflict: "user_id,source" },
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

  return NextResponse.json({ success: true, needsRefresh });
}
