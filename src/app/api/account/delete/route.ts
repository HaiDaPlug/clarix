import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/server";
import { disconnectGoogle, getGoogleConnectionStore } from "@/lib/google/connection";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

// GDPR erasure (integritetspolicy §8: "raderas alla dina uppgifter ... inom 30 dagar").
// This endpoint does it immediately rather than within 30 days.
//
// Order matters:
//   1. Revoke the grant AT GOOGLE first. Deleting our row would orphan a live
//      grant on Google's side that the user can then only remove from their
//      Google account settings.
//   2. Delete the auth.users row. Every table holding this user's data carries
//      `user_id ... references auth.users(id) on delete cascade`, verified
//      across the migrations:
//        google_connections, clients (→ client_sources), ai_report_cache,
//        google_report_cache, shared_reports, connected_sources (legacy).
//      So one delete clears all of them; no per-table cleanup to drift out of
//      sync when a table is added.
//      `auth_failures` is deliberately untouched — it stores reason/status
//      only, no user id and no personal data.
//
// Step 1 failing must NOT block step 2: the user asked to be erased, and a
// Google outage is not a reason to keep their data. The failure is logged and
// reported in the response so it can be followed up manually.

export async function POST() {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx.response;

  const admin = createAdminClient();
  if (!admin) {
    // Same honesty rule as the Google connection surface: a missing server key
    // is a server fault, never reported as if the deletion had happened.
    console.error("[account/delete] no admin client — SUPABASE_SECRET_KEY missing");
    return NextResponse.json(
      { error: { type: "server", message: "Kontot kunde inte raderas just nu. Kontakta support." } },
      { status: 500 },
    );
  }

  const userId = ctx.user.id;
  let googleRevoked = true;

  const store = getGoogleConnectionStore();
  if (store) {
    try {
      await disconnectGoogle(store, userId, { revoke: true });
    } catch (err) {
      googleRevoked = false;
      console.error(
        "[account/delete] Google revoke failed; deleting the account anyway",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account/delete] deleteUser failed", error.message);
    return NextResponse.json(
      { error: { type: "server", message: "Kontot kunde inte raderas just nu. Kontakta support." } },
      { status: 500 },
    );
  }

  console.log("[account/delete] account erased", { googleRevoked });

  // The session cookies now point at a user that no longer exists. Clear them
  // so the browser is not left holding a token for a deleted account.
  const response = NextResponse.json({ success: true, googleRevoked });
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
  return response;
}
