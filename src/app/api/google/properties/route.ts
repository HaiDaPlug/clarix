import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDiscoverableGoogleProperties } from "@/lib/google/property-discovery";
import { getValidAccessToken } from "@/lib/google/token-refresh";
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
      {
        ga4: [],
        gsc: [],
        error: { type: "auth", message: "You must be signed in." },
      },
      { status: 401 },
    );
  }

  // provider_token is only present immediately after OAuth exchange.
  // Fall back to the token stored in connected_sources.
  const { data: { session } } = await supabase.auth.getSession();
  let accessToken: string | null = null;

  try {
    accessToken = await getDiscoveryAccessToken(
      supabase,
      user.id,
      session?.provider_token ?? undefined,
    );
  } catch (err) {
    if (isTokenRefreshFailure(err)) {
      return NextResponse.json(
        {
          ga4: [],
          gsc: [],
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

  if (!accessToken) {
    return NextResponse.json(
      {
        ga4: [],
        gsc: [],
        error: {
          type: "auth",
          message:
            "Google access is missing. Sign in with Google again to grant Analytics and Search Console access.",
        },
      },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json(
      await fetchDiscoverableGoogleProperties(accessToken),
    );
  } catch {
    return NextResponse.json(
      {
        ga4: [],
        gsc: [],
        error: {
          type: "data",
          message: "Could not load Google properties for this account.",
        },
      },
      { status: 502 },
    );
  }
}

async function getDiscoveryAccessToken(
  supabase: SupabaseClient,
  userId: string,
  sessionToken: string | undefined,
): Promise<string | null> {
  if (sessionToken) return sessionToken;

  const { data: rows } = await supabase
    .from("connected_sources")
    .select("source, property_id")
    .eq("user_id", userId)
    .in("source", ["ga4", "gsc"]);

  const candidates = (rows ?? [])
    .filter(
      (row): row is { source: "ga4" | "gsc"; property_id: string } =>
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
    try {
      const token = await getValidAccessToken(
        supabase,
        userId,
        candidate.source,
        candidate.property_id,
        undefined,
      );
      if (token) return token;
    } catch (err) {
      if (isTokenRefreshFailure(err)) {
        sawRefreshFailure = true;
        continue;
      }
      throw err;
    }
  }

  if (sawRefreshFailure) throw new Error("token_refresh_failed");
  return null;
}

function isTokenRefreshFailure(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("token_refresh_failed");
}
