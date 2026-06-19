import { createHash } from "crypto";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AiInsightsPayloadSchema } from "@/lib/ai-insights/types";
import { ReportDataSchema } from "@/types/schema";
import { createClient } from "@/utils/supabase/server";
import { SharedReportClient } from "./SharedReportClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type SharedReportSnapshotRow = {
  report_data: unknown;
  ai_insights: unknown;
};

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) {
    return <ShareError />;
  }

  const tokenHash = hashShareToken(token);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .rpc("get_shared_report_by_token_hash", { p_token_hash: tokenHash })
    .maybeSingle();
  const row = data as SharedReportSnapshotRow | null;

  if (error) {
    console.error("[shared-report] lookup failed", error.message);
    return <ShareError />;
  }

  if (!row) {
    return <ShareError />;
  }

  const reportData = ReportDataSchema.safeParse(row.report_data);
  const aiInsights = row.ai_insights
    ? AiInsightsPayloadSchema.safeParse(row.ai_insights)
    : null;

  if (!reportData.success) {
    console.error("[shared-report] invalid report snapshot", reportData.error.flatten());
    return <ShareError />;
  }

  return (
    <SharedReportClient
      reportData={reportData.data}
      aiInsights={aiInsights?.success ? aiInsights.data : null}
    />
  );
}

function ShareError() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[oklch(0.965_0.005_270)] px-6 text-foreground">
      <div className="max-w-sm text-center">
        <p className="text-2xl font-bold">{"L\u00e4nken kunde inte anv\u00e4ndas"}<span style={{ color: "#FF6B55" }}>.</span></p>
        <p className="mt-3 text-sm text-foreground/60">
          {"Be den som skapade rapporten att skicka en ny delningsl\u00e4nk."}
        </p>
      </div>
    </main>
  );
}
