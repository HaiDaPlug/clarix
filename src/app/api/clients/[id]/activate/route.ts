import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { ClientNotFoundError, setActiveClient } from "@/lib/clients/server";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

// Makes one workspace the active one. Atomic on the database side, so there
// is never a moment with zero or two active workspaces.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid workspace id." } }, { status: 400 });
  }

  const ctx = await requireUser();
  if (!ctx.ok) return ctx.response;

  try {
    await setActiveClient(ctx.supabase, ctx.user.id, id);
    return NextResponse.json({ success: true, activeClientId: id });
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return NextResponse.json({ error: { type: "not_found", message: "Workspace not found." } }, { status: 404 });
    }
    console.error("[clients] activate failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not switch workspace." } }, { status: 500 });
  }
}
