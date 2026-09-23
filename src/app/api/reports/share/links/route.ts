import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { shareLinkState } from "@/lib/reports/share-links";

export const dynamic = "force-dynamic";

// The owner's own share links, for the management view.
//
// The plaintext token is NOT stored (only sha256(token)), so this list can
// never hand back a working URL — by design. The owner copies the URL when
// the link is created; afterwards they can see it exists and revoke it, but
// not recover it. That is the correct trade-off: a leaked database must not
// yield working links.

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("shared_reports")
    .select("id, period_start, period_end, workspace_label, created_at, expires_at, revoked_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[reports/share/links] list failed", error.message);
    return NextResponse.json(
      { error: { type: "server", message: "Kunde inte hämta delningslänkar." } },
      { status: 500 },
    );
  }

  const links = (data ?? []).map((row) => ({
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    workspaceLabel: row.workspace_label,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    state: shareLinkState(row),
  }));

  return NextResponse.json({ links });
}
