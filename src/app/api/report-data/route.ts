import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedContext, unauthorizedJson } from "@/lib/auth/server";
import { ClientNotFoundError } from "@/lib/clients/server";
import { assertDateRange } from "@/lib/google/date-range";
import { buildReportDataForUser } from "@/lib/report-data/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  /** The workspace the caller is showing. Verified to belong to the user; never defaulted. */
  clientId: z.string().uuid(),
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  periodLabel: z.string().trim().min(1).max(120).optional(),
  locale: z.enum(["sv", "en"]).optional(),
});

// The only way the browser obtains report numbers. The caller names the
// workspace; the server verifies ownership and reads exactly that workspace's
// properties. There is no "active" fallback here — a page that has not
// resolved which workspace it shows cannot ask for numbers.
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { type: "validation", message: "Invalid request body." } }, { status: 400 });
  }

  const { clientId, dateRange, locale = "sv" } = parsed.data;
  try {
    assertDateRange(dateRange);
  } catch (err) {
    return NextResponse.json(
      { error: { type: "validation", message: err instanceof Error ? err.message : "Invalid date range." } },
      { status: 400 },
    );
  }

  const ctx = await getAuthedContext();
  if (!ctx) return unauthorizedJson();

  const periodLabel = parsed.data.periodLabel ?? `${dateRange.startDate} – ${dateRange.endDate}`;

  try {
    const result = await buildReportDataForUser({
      supabase: ctx.supabase,
      userId: ctx.user.id,
      clientId,
      dateRange,
      periodLabel,
      locale,
      caller: "report-data",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return NextResponse.json({ error: { type: "not_found", message: "Workspace not found." } }, { status: 404 });
    }
    console.error("[report-data] failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { type: "server", message: "Could not build the report." } }, { status: 500 });
  }
}
