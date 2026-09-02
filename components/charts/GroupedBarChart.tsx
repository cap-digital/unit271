"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtValue, makeAxisFormatter, type ValueFormat } from "@/lib/format";
import { CHART_CHROME } from "@/lib/palette";
import { TooltipBox } from "./ChartTooltip";

export interface GroupedSeries {
  key: string;
  label: string;
  color: string;
}

export interface GroupedDatum {
  category: string;
  [seriesKey: string]: number | null | string;
}

interface GroupedBarChartProps {
  data: GroupedDatum[];
  series: GroupedSeries[];
  format: ValueFormat;
  height?: number;
  stacked?: boolean;
}

const CHART_H = "h-[25vh] min-h-[168px] max-h-[300px]";

/** Colunas agrupadas (ou empilhadas) por categoria — ex.: faixa etária × gênero. */
export function GroupedBarChart({ data, series, format, height, stacked = false }: GroupedBarChartProps) {
  let maxAbs = 0;
  for (const d of data) {
    let stackSum = 0;
    for (const s of series) {
      const v = d[s.key];
      if (typeof v !== "number") continue;
      if (stacked) stackSum += v;
      else if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    }
    if (stacked && stackSum > maxAbs) maxAbs = stackSum;
  }
  const yTick = makeAxisFormatter(format, maxAbs);
  return (
    <div style={height ? { height } : undefined} className={`w-full ${height ? "" : CHART_H}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap="28%" barGap={2}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.grid} />
          <XAxis dataKey="category" tickLine={false} axisLine={{ stroke: CHART_CHROME.axis }} dy={6} />
          <YAxis tickFormatter={yTick} tickLine={false} axisLine={false} width={56} domain={[0, "auto"]} />
          <Tooltip
            cursor={{ fill: "rgba(14,47,79,0.05)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const rows = series.map((s) => {
                const p = payload.find((x) => x.dataKey === s.key);
                return { label: s.label, value: fmtValue((p?.value as number | null | undefined) ?? null, format), color: s.color, kind: "rect" as const };
              });
              return <TooltipBox title={String(label)} rows={rows} />;
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "a" : undefined}
              radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]}
              maxBarSize={24}
              stroke={stacked ? CHART_CHROME.surface : undefined}
              strokeWidth={stacked ? 2 : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
