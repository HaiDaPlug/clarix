import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google/token-refresh";
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
      let storedCredential: Awaited<ReturnType<typeof getStoredGoogleCredential>>;
      try {
        storedCredential = await getStoredGoogleCredential(supabase, user.id);
      } catch (err) {
        if (isTokenRefreshFailure(err)) {
          return NextResponse.json(
            {
              error: {
                type: "auth",
                message: "Google access has expired. Sign in with Google again.",
              },
            },
            { status: 401 },
          );
        }
        throw err;
      }
      if (storedCredential) {
        accessToken = storedCredential.accessToken;
        refreshToken = storedCredential.refreshToken;
        expiresAt = storedCredential.expiresAt;
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
    .eq("source", "ga4")
    .eq("property_id", "_pending");

  return NextResponse.json({ success: true, needsRefresh });
}

async function getStoredGoogleCredential(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
} | null> {
  const { data: rows } = await supabase
    .from("connected_sources")
    .select("source, property_id, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .in("source", ["ga4", "gsc"]);

  const candidates = (rows ?? [])
    .filter(
      (row): row is {
        source: "ga4" | "gsc";
        property_id: string;
        refresh_token: string | null;
        token_expires_at: string | null;
      } =>
        (row.source === "ga4" || row.source === "gsc") &&
        typeof row.property_id === "string",
    )
    .sort((a, b) => {
      if (a.property_id === "_pending") return -1;
      if (b.property_id === "_pending") return 1;
      return 0;
    });

  let sawRefreshFailure = false;
  for (const candidate of candidates) {
    let accessToken: string | null = null;
    try {
      accessToken = await getValidAccessToken(
        supabase,
        userId,
        candidate.source,
        candidate.property_id,
        undefined,
      );
    } catch (err) {
      if (isTokenRefreshFailure(err)) {
        sawRefreshFailure = true;
        continue;
      }
      throw err;
    }

    if (accessToken) {
      return {
        accessToken,
        refreshToken: candidate.refresh_token,
        expiresAt: candidate.token_expires_at,
      };
    }
  }

  if (sawRefreshFailure) throw new Error("token_refresh_failed");
  return null;
}

function isTokenRefreshFailure(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("token_refresh_failed");
}
