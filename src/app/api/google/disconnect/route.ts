import { NextResponse } from "next/server";
import { getAuthedContext, unauthorizedJson } from "@/lib/auth/server";
import {
  disconnectGoogle,
  getGoogleConnectionHealth,
  getGoogleConnectionStore,
  misconfiguredHealth,
} from "@/lib/google/connection";
import { clearReportCache } from "@/lib/google/report-cache";

export const dynamic = "force-dynamic";

// Removes the Google grant (revoking it at Google first). Workspaces and
// their property assignments are deliberately left intact: reconnecting
// later brings everything back without re-selecting anything.
export async function POST() {
  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  const store = getGoogleConnectionStore();
  if (!store) {
    return NextResponse.json({ google: misconfiguredHealth() }, { status: 500 });
  }

  try {
    await disconnectGoogle(store, ctx.user.id, { revoke: true });
    await Promise.all([
      clearReportCache(ctx.supabase, ctx.user.id, "ga4"),
      clearReportCache(ctx.supabase, ctx.user.id, "gsc"),
    ]);
    const google = await getGoogleConnectionHealth(store, ctx.user.id);
    return NextResponse.json({ success: true, google });
  } catch (err) {
    console.error("[google/disconnect] failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: { type: "server", message: "Could not disconnect Google." } },
      { status: 500 },
    );
  }
}
