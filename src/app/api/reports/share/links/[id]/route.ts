import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({ id: z.string().uuid() });

// Revoke one share link. The row is kept (not deleted) so the owner can still
// see that the link existed and when it was withdrawn; the snapshot stops
// being served the moment revoked_at is set, because the public lookup RPC
// filters on it.
//
// The `.eq("owner_user_id", user.id)` filter is not decoration: RLS already
// restricts this table to the owner, but the explicit filter means a policy
// regression cannot turn this into a cross-user write.

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = ParamsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { type: "request", message: "Ogiltig länk-id." } },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("shared_reports")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("owner_user_id", user.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[reports/share/links] revoke failed", error.message);
    return NextResponse.json(
      { error: { type: "server", message: "Kunde inte återkalla länken." } },
      { status: 500 },
    );
  }

  // No row: either it is not this user's link, or it was already revoked.
  // Both answer 404 — the owner learns nothing about other users' links.
  if (!data) {
    return NextResponse.json(
      { error: { type: "not_found", message: "Länken finns inte eller är redan återkallad." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, id: data.id });
}
