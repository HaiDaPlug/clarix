import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchDiscoverableGoogleProperties } from "@/lib/google/property-discovery";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.provider_token;

  if (!session?.user || !accessToken) {
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
