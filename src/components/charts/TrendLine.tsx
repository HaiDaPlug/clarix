"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TimeSeriesPoint } from "@/types/schema";
import { formatNumber } from "@/lib/utils/format";

interface TrendLineProps {
  data: TimeSeriesPoint[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showAxes?: boolean;
  unit?: string;
  useAccent?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit?: string;
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--charcoal)] text-[var(--parchment)] px-3 py-2 text-[11px] rounded-sm">
      <p className="text-[var(--slate-light)] mb-0.5">{label}</p>
      <p className="font-medium">{formatNumber(payload[0].value, unit)}</p>
    </div>
  );
}

export function TrendLine({
  data,
  color = "var(--charcoal)",
  height = 180,
  showGrid = false,
  showAxes = false,
  unit,
  useAccent = false,
}: TrendLineProps) {
  const uid = `tl-${(useAccent ? "accent" : color.replace(/[^a-z0-9]/gi, "").slice(0, 8))}-${data.length}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          {useAccent ? (
            <>
              {/* horizontal gradient for the stroke */}
              <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent-coral)" />
                <stop offset="100%" stopColor="var(--accent-amber)" />
              </linearGradient>
              {/* vertical gradient for the fill area */}
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-coral)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--accent-amber)" stopOpacity={0} />
              </linearGradient>
            </>
          ) : (
            <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rule-light)" vertical={false} />
        )}
        {showAxes && (
          <>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--slate-light)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => {
                const d = new Date(v);
                return d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--slate-light)" }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => formatNumber(v, unit)}
            />
          </>
        )}
        <Tooltip content={<CustomTooltip unit={unit} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={useAccent ? `url(#${uid}-stroke)` : color}
          strokeWidth={1.5}
          fill={`url(#${uid}-fill)`}
          dot={false}
          activeDot={{
            r: 3,
            fill: useAccent ? "var(--accent-amber)" : color,
            strokeWidth: 0,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
