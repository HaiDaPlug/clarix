"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { formatNumber } from "@/lib/utils/format";

interface BarItem {
  label: string;
  value: number;
  share?: number;
  highlight?: boolean;
}

interface BarComparisonProps {
  data: BarItem[];
  height?: number;
  unit?: string;
  highlightIndex?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: BarItem }[];
  unit?: string;
}

function CustomTooltip({ active, payload, unit }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-[var(--charcoal)] text-[var(--parchment)] px-3 py-2 text-[11px] rounded-sm">
      <p className="text-[var(--slate-light)] mb-0.5">{item.label}</p>
      <p className="font-medium">{formatNumber(payload[0].value, unit)}</p>
      {item.share !== undefined && (
        <p className="text-[var(--slate-light)]">{item.share.toFixed(1)}% share</p>
      )}
    </div>
  );
}

export function BarComparison({
  data,
  height = 200,
  unit,
  highlightIndex = 0,
}: BarComparisonProps) {
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
        barCategoryGap="28%"
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 11, fill: "var(--slate)", fontFamily: "var(--font-body)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: "var(--rule-light)" }} />
        <Bar dataKey="value" radius={[0, 2, 2, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={index === highlightIndex ? "var(--charcoal)" : "var(--bone-dark)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
