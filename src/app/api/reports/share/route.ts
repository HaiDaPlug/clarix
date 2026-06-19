import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashAiInsightMetrics } from "@/lib/ai-insights/cache";
import { AiInsightsPayloadSchema } from "@/lib/ai-insights/types";
import { buildReportDataForUser } from "@/lib/report-data/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
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

    const { period, locale = "sv" } = parsed.data;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await buildReportDataForUser({
      supabase,
      userId: user.id,
      dateRange: { startDate: period.start, endDate: period.end },
      periodLabel: period.label,
      locale,
      caller: "reports-share",
    });

    if (report.status !== "ok") {
      return NextResponse.json(
        { error: "Report data unavailable", reason: report.status },
        { status: 422 },
      );
    }

    const { data: cacheRow } = await supabase
      .from("ai_report_cache")
      .select("insights, generation_status, metrics_hash")
      .eq("user_id", user.id)
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
