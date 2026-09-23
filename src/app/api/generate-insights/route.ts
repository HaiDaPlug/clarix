import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import {
  generateAiInsightsText,
  AiInsightsProviderError,
} from "@/lib/ai-insights/generate";
import { deriveInsights, hasSufficientData } from "@/lib/engine/derive-insights";
import {
  AiInsightsPayloadSchema,
  createNullAiInsightsPayload,
  type AiInsightsPayload,
} from "@/lib/ai-insights/types";
import { hashAiInsightMetrics } from "@/lib/ai-insights/cache";
import { buildEvidenceRegistry } from "@/lib/ai-insights/evidence";
import { buildPrompt } from "@/lib/ai-insights/prompt";
import { extractJsonObject, applySufficiencyGate } from "@/lib/ai-insights/parse";
import type { InsightSurface } from "@/lib/engine/derive-insights";
import { ClientNotFoundError } from "@/lib/clients/server";
import { buildReportDataForUser } from "@/lib/report-data/server";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  period: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
    label: z.string().min(1),
  }),
  // The workspace whose numbers the caller is showing. Insights are built
  // and cached for exactly this workspace; there is no "active" fallback.
  clientId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { period, clientId } = parsed.data;
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
        locale: "sv",
        caller: "generate-insights",
      });
    } catch (err) {
      if (err instanceof ClientNotFoundError) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }
      throw err;
    }

    if (report.status !== "ok") {
      console.warn("[generate-insights] buildReportData did not return ok", {
        user: user.id.slice(0, 8),
        client: clientId.slice(0, 8),
        period: `${period.start}..${period.end}`,
        status: report.status,
      });
      return NextResponse.json({
        insights: createNullAiInsightsPayload(),
        reason: report.status,
      });
    }

    const reportData = report.data;
    const metricsHash = hashAiInsightMetrics(reportData);
    const logContext = {
      user: user.id.slice(0, 8),
      client: clientId.slice(0, 8),
      period: `${period.start}..${period.end}`,
      label: period.label,
      hash: metricsHash.slice(0, 12),
    };

    // ── Atomic generation lease via RPC ─────────────────────────────────────
    // claim_ai_insights_generation serialises concurrent requests at the DB level.
    // It returns one of three states:
    //   { claimed: true,  cached: false } → we own generation
    //   { claimed: false, cached: true  } → fresh done row exists, read it
    //   { claimed: false, cached: false } → another request is generating; tell client to poll
    const { data: claim, error: claimError } = await supabase.rpc(
      "claim_ai_insights_generation",
      {
        p_user_id:       user.id,
        p_client_id:     clientId,
        p_period_start:  period.start,
        p_period_end:    period.end,
        p_metrics_hash:  metricsHash,
        p_lease_seconds: 60,
      },
    );

    console.log("[generate-insights] cache claim", {
      ...logContext,
      claim,
      claimError: claimError?.message ?? null,
    });

    if (claimError) {
      // RPC failure is non-fatal — fall through to generate without a lock.
      // Worst case: two requests generate in parallel and the last write wins.
      console.error("[generate-insights] claim RPC failed:", claimError.message);
    } else if (claim?.cached === true) {
      // Fresh done row — read insights directly.
      const { data: cached } = await supabase
        .from("ai_report_cache")
        .select("insights")
        .eq("user_id", user.id)
        .eq("client_id", clientId)
        .eq("period_start", period.start)
        .eq("period_end", period.end)
        .maybeSingle();

      const result = AiInsightsPayloadSchema.safeParse(cached?.insights);
      const hasAnyContent =
        result.success && Object.values(result.data).some((v) => v !== null);
      if (hasAnyContent) {
        console.log("[generate-insights] cache hit", logContext);
        return NextResponse.json({ insights: result.data, cached: true });
      }
      console.log("[generate-insights] cache row ignored: empty payload", logContext);
      // Cache row exists but content is all-null — fall through and generate.
    } else if (claim?.claimed === false && claim?.cached === false) {
      // Another request holds the lease. Tell the client to poll.
      console.log("[generate-insights] generation pending", logContext);
      return NextResponse.json({ generating: true }, { status: 202 });
    }
    // claim?.claimed === true → we own the lease, proceed with generation.

    const insights = deriveInsights(reportData);
    const sufficient: Record<InsightSurface, boolean> = {
      dashboard_hero: hasSufficientData("dashboard_hero", insights, reportData),
      slide_hero: true, // always generate — component shows shimmer until resolved
      slide_insight: hasSufficientData("slide_insight", insights, reportData),
      slide_recs: hasSufficientData("slide_recs", insights, reportData),
      slide_recap: hasSufficientData("slide_recap", insights, reportData),
      next_steps: hasSufficientData("next_steps", insights, reportData),
    };
    // Not gated on warning signals like next_steps: a period that went well
    // still has a next step (build on what worked). Any traffic is enough.
    const stepsSufficient = hasSufficientData("slide_hero", insights, reportData);

    console.log("[generate-insights] sufficiency + insights", {
      ...logContext,
      sufficient,
      insightCount: insights.length,
      insightTypes: insights.map((i) => `${i.type}:${i.severity}`),
      totalSessions: reportData.trafficOverview?.totalSessions?.value ?? null,
      availableSources: reportData.meta.availableSources,
    });

    if (!stepsSufficient && !Object.values(sufficient).some(Boolean)) {
      const payload = createNullAiInsightsPayload();
      await supabase.from("ai_report_cache").upsert(
        {
          user_id: user.id,
          client_id: clientId,
          period_start: period.start,
          period_end: period.end,
          metrics_hash: metricsHash,
          generation_status: "done",
          generation_expires_at: null,
          generated_at: new Date().toISOString(),
          insights: payload,
        },
        { onConflict: "user_id,client_id,period_start,period_end" },
      );
      console.log("[generate-insights] cached null payload: insufficient data", logContext);
      return NextResponse.json({ insights: payload, cached: false });
    }

    // Helper: mark our lease as failed so the next request can reclaim it
    // immediately rather than waiting for the 60-second TTL to expire.
    const releaseLeaseFailed = () =>
      supabase.from("ai_report_cache").update({
        generation_status: "failed",
        generation_expires_at: null,
      })
      .eq("user_id", user.id)
      .eq("client_id", clientId)
      .eq("period_start", period.start)
      .eq("period_end", period.end);

    const prompt = buildPrompt(insights, reportData, sufficient, period.label, stepsSufficient);
    let raw: string;
    try {
      console.log("[generate-insights] provider call start", {
        ...logContext,
        insightCount: insights.length,
        sufficient,
      });
      raw = await generateAiInsightsText(prompt);
      console.log("[generate-insights] provider call done", {
        ...logContext,
        chars: raw.length,
      });
    } catch (err) {
      if (err instanceof AiInsightsProviderError) {
        console.error("[generate-insights] provider config error:", err.message);
      } else {
        console.error("[generate-insights] provider call failed:", err);
      }
      // Release the lease so the next request can retry. A config error or
      // transient outage should not block future requests for 60 seconds.
      await releaseLeaseFailed();
      console.log("[generate-insights] lease marked failed after provider error", logContext);
      return NextResponse.json({ insights: createNullAiInsightsPayload(), cached: false });
    }

    let payload: AiInsightsPayload | null;
    try {
      const json = extractJsonObject(raw);
      const result = AiInsightsPayloadSchema.safeParse(json);
      payload = result.success
        ? applySufficiencyGate(result.data, sufficient, stepsSufficient, new Set(Object.keys(buildEvidenceRegistry(reportData))))
        : null;
    } catch (e) {
      console.error("[generate-insights] extractJsonObject threw:", e);
      payload = null;
    }

    if (!payload) {
      // Model returned malformed/unparseable JSON. Release lease so next
      // request can retry after prompt/model tweaks.
      console.error("[generate-insights] failed to parse model output:", raw.slice(0, 500));
      await releaseLeaseFailed();
      console.log("[generate-insights] lease marked failed after parse error", logContext);
      return NextResponse.json({ insights: createNullAiInsightsPayload(), cached: false });
    }

    await supabase.from("ai_report_cache").upsert(
      {
        user_id: user.id,
        client_id: clientId,
        period_start: period.start,
        period_end: period.end,
        metrics_hash: metricsHash,
        generation_status: "done",
        generation_expires_at: null,
        generated_at: new Date().toISOString(),
        insights: payload,
      },
      { onConflict: "user_id,client_id,period_start,period_end" },
    );

    console.log("[generate-insights] cache write done", {
      ...logContext,
      slots: Object.entries(payload)
        .filter(([, value]) => value !== null)
        .map(([slot]) => slot),
    });

    return NextResponse.json({ insights: payload, cached: false });
  } catch (err) {
    console.error("[generate-insights]", err);
    return NextResponse.json({ insights: createNullAiInsightsPayload(), fallback: true });
  }
}
