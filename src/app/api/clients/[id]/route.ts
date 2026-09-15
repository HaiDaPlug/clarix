import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedContext, unauthorizedJson } from "@/lib/auth/server";
import {
  ClientNotFoundError,
  deleteClientWorkspace,
  updateClientWorkspace,
} from "@/lib/clients/server";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    domain: z.string().trim().max(253).nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.domain !== undefined, { message: "Nothing to update." });

const idSchema = z.string().uuid();

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid workspace id." } }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid workspace payload." } }, { status: 400 });
  }

  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const client = await updateClientWorkspace(ctx.supabase, ctx.user.id, id, parsed.data);
    return NextResponse.json({ client });
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return NextResponse.json({ error: { type: "not_found", message: "Workspace not found." } }, { status: 404 });
    }
    console.error("[clients] update failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not update the workspace." } }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid workspace id." } }, { status: 400 });
  }

  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const { nextActiveId } = await deleteClientWorkspace(ctx.supabase, ctx.user.id, id);
    return NextResponse.json({ success: true, activeClientId: nextActiveId });
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return NextResponse.json({ error: { type: "not_found", message: "Workspace not found." } }, { status: 404 });
    }
    console.error("[clients] delete failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "database", message: "Could not delete the workspace." } }, { status: 500 });
  }
}
