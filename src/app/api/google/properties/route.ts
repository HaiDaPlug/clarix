import { NextResponse } from "next/server";
import { getAuthedContext, unauthorizedJson } from "@/lib/auth/server";
import { getGoogleConnectionStore, withGoogleAccessToken } from "@/lib/google/connection";
import {
  GooglePropertyDiscoveryError,
  fetchDiscoverableGoogleProperties,
} from "@/lib/google/property-discovery";

export const dynamic = "force-dynamic";

// Every GA4 property and Search Console site the grant can see. Returns an
// empty list plus the health object (HTTP 200) when the grant is unusable —
// that is a state, not an error, and the UI renders it as such.
export async function GET() {
  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const result = await withGoogleAccessToken(
      getGoogleConnectionStore(),
      ctx.user.id,
      (accessToken) => fetchDiscoverableGoogleProperties(accessToken),
      (error) => error instanceof GooglePropertyDiscoveryError && error.status === 401,
    );

    if (!result.ok) {
      return NextResponse.json({ ga4: [], gsc: [], google: result.health });
    }

    return NextResponse.json({ ...result.value, google: result.health });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[google/properties] discovery failed:", detail);
    return NextResponse.json(
      {
        ga4: [],
        gsc: [],
        error: { type: "data", message: "Could not load Google properties for this account." },
      },
      { status: 502 },
    );
  }
}
