import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { getGoogleConnectionHealth, getGoogleConnectionStore } from "@/lib/google/connection";

export const dynamic = "force-dynamic";

// Canonical Google authorization health for the signed-in user.
// `?verify=1` forces a refresh round-trip so the answer reflects what Google
// thinks of the refresh token right now — used by the Integrations page,
// which must never show a green badge for a dead grant.
export async function GET(request: Request) {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx.response;

  const verify = new URL(request.url).searchParams.get("verify") === "1";

  try {
    const health = await getGoogleConnectionHealth(getGoogleConnectionStore(), ctx.user.id, { verify });
    return NextResponse.json({ google: health });
  } catch (err) {
    console.error("[google/connection] health check failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: { type: "server", message: "Could not check the Google connection." } },
      { status: 500 },
    );
  }
}
