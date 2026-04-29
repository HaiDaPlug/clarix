import type { DataSource, ReportData } from "@/types/schema";

export type ConnectableSource = "ga4" | "gsc";

export type ConnectedSource = {
  id: string;
  source: ConnectableSource;
  property_id: string;
  display_name: string | null;
  token_expires_at: string | null;
  needs_refresh?: boolean;
};

export type GooglePropertiesResponse = {
  ga4: Array<{ propertyId: string; displayName: string }>;
  gsc: Array<{ siteUrl: string; displayName: string }>;
  error?: {
    type: "auth" | "data";
    message: string;
  };
};

export function currentCalendarMonthRange(today = new Date()): {
  startDate: string;
  endDate: string;
} {
  const year = today.getFullYear();
  const month = today.getMonth();

  return {
    startDate: toLocalIsoDate(new Date(year, month, 1)),
    endDate: toLocalIsoDate(new Date(year, month + 1, 0)),
  };
}

export function mergeReportData(
  fallback: ReportData,
  parts: Array<Partial<ReportData> | undefined>,
  connectedSources: ConnectableSource[],
): ReportData {
  const merged = parts.reduce<ReportData>(
    (acc, part) => (part ? { ...acc, ...part } : acc),
    fallback,
  );

  const availableSources = Array.from(
    new Set<DataSource>([...fallback.meta.availableSources, ...connectedSources]),
  );

  return {
    ...merged,
    meta: {
      ...fallback.meta,
      ...merged.meta,
      availableSources,
    },
    sourceConfidence: {
      ...fallback.sourceConfidence,
      ...parts.reduce<NonNullable<ReportData["sourceConfidence"]>>(
        (acc, part) => ({ ...acc, ...part?.sourceConfidence }),
        {},
      ),
    },
  };
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
