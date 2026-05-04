import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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
  // Fall back to the token stored in connected_sources (_pending sentinel row).
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken =
    session?.provider_token ??
    (await getValidAccessToken(
      supabase,
      user.id,
      "ga4",
      "_pending",
      undefined,
    ));

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
  } catch (err) {
    const isTokenRefreshFailure =
      err instanceof Error && err.message.startsWith("token_refresh_failed");
    const isAuthError =
      isTokenRefreshFailure ||
      (err instanceof Error &&
        (err.message.includes("401") || err.message.includes("403")));
    return NextResponse.json(
      {
        ga4: [],
        gsc: [],
        error: {
          type: isAuthError ? "auth" : "data",
          message: isAuthError
            ? "Google access has expired. Sign in with Google again."
            : "Could not load Google properties for this account.",
        },
      },
      { status: isAuthError ? 401 : 502 },
    );
  }
}
