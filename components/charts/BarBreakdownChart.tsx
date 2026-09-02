"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtValue, type ValueFormat } from "@/lib/format";
import { CHART_CHROME, ORDINAL_RAMP, ordinalSteps } from "@/lib/palette";
import { TooltipBox } from "./ChartTooltip";

export interface BarDatum {
  label: string;
  value: number | null;
  /** Cor explícita (quando a identidade é a plataforma). */
  color?: string;
  /** Linha extra no tooltip. */
  hint?: string;
}

interface BarBreakdownChartProps {
  data: BarDatum[];
  format: ValueFormat;
  /** single: mesma matiz · ordinal: rampa clara→escura (categorias ordenadas) · given: cor do dado */
  colorMode?: "single" | "ordinal" | "given";
  valueLabel?: string;
}

/** Barras horizontais finas com valor na ponta (substitui o eixo X). */
export function BarBreakdownChart({ data, format, colorMode = "single", valueLabel = "Valor" }: BarBreakdownChartProps) {
  const rows = data.map((d) => ({ ...d, value: d.value ?? 0 }));
  const height = Math.max(112, rows.length * 30 + 14);
  const colors = colorMode === "ordinal" ? ordinalSteps(rows.length) : rows.map((d) => (colorMode === "given" && d.color ? d.color : ORDINAL_RAMP[2]));
  const maxLabel = Math.max(...rows.map((r) => r.label.length), 6);
  const yWidth = Math.min(180, Math.max(72, maxLabel * 6.4));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="label" width={yWidth} tickLine={false} axisLine={false} tick={{ fill: CHART_CHROME.ink, fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgba(14,47,79,0.05)" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d = payload[0].payload as BarDatum & { value: number };
              return <TooltipBox title={d.label} rows={[{ label: valueLabel, value: fmtValue(d.value, format), color: d.color ?? ORDINAL_RAMP[2], kind: "rect" }]} footer={d.hint} />;
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {rows.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(v: number) => fmtValue(v, format)} style={{ fill: CHART_CHROME.ink, fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
