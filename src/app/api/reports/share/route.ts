import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashAiInsightMetrics } from "@/lib/ai-insights/cache";
import { AiInsightsPayloadSchema } from "@/lib/ai-insights/types";
import { requireUser } from "@/lib/auth/server";
import { ClientNotFoundError } from "@/lib/clients/server";
import { buildReportDataForUser } from "@/lib/report-data/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  /** The workspace being shared. Verified to belong to the user; never defaulted. */
  clientId: z.string().uuid(),
  period: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string().min(1),
  }),
  locale: z.enum(["sv", "en"]).optional(),
});

function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { clientId, period, locale = "sv" } = parsed.data;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { supabase, user } = auth;

    let report: Awaited<ReturnType<typeof buildReportDataForUser>>;
    try {
      report = await buildReportDataForUser({
        supabase,
        userId: user.id,
        clientId,
        dateRange: { startDate: period.start, endDate: period.end },
        periodLabel: period.label,
        locale,
        caller: "reports-share",
      });
    } catch (err) {
      if (err instanceof ClientNotFoundError) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }
      throw err;
    }

    if (report.status !== "ok") {
      return NextResponse.json(
        { error: "Report data unavailable", reason: report.status },
        { status: 422 },
      );
    }

    // Insights are cached per workspace; only the active workspace's copy may
    // ever be attached to its snapshot.
    const { data: cacheRow } = await supabase
      .from("ai_report_cache")
      .select("insights, generation_status, metrics_hash")
      .eq("user_id", user.id)
      .eq("client_id", report.workspace.id)
      .eq("period_start", period.start)
      .eq("period_end", period.end)
      .maybeSingle();

    const metricsHash = hashAiInsightMetrics(report.data);
    const parsedInsights =
      cacheRow?.generation_status === "done" && cacheRow.metrics_hash === metricsHash
        ? AiInsightsPayloadSchema.safeParse(cacheRow.insights)
        : null;
    const aiInsights = parsedInsights?.success ? parsedInsights.data : null;

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashShareToken(token);
    const { error: insertError } = await supabase
      .from("shared_reports")
      .insert({
        share_token_hash: tokenHash,
        owner_user_id: user.id,
        period_start: period.start,
        period_end: period.end,
        report_data: report.data,
        ai_insights: aiInsights,
      });

    if (insertError) {
      console.error("[reports/share] insert failed", insertError.message);
      return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
    }

    const url = `/r/${token}`;
    const absoluteUrl = new URL(url, request.url).toString();
    return NextResponse.json({ url, absoluteUrl });
  } catch (error) {
    console.error("[reports/share]", error);
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }
}
