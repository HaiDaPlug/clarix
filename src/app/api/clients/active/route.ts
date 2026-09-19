import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { getActiveClient } from "@/lib/clients/server";

export const dynamic = "force-dynamic";

// The user's navigation preference: which workspace a page should open on.
// Pages resolve this once, then name that workspace explicitly on every
// data request. It is a default, never a data-security context.
export async function GET() {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx.response;

  try {
    const client = await getActiveClient(ctx.supabase, ctx.user.id);
    return NextResponse.json({ client });
  } catch (err) {
    console.error("[clients/active] failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not load the active workspace." } }, { status: 500 });
  }
}
