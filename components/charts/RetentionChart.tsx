"use client";

import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtPct } from "@/lib/format";
import { CHART_CHROME, DEEMPHASIS_COLOR, TOTAL_COLOR } from "@/lib/palette";
import { TooltipBox } from "./ChartTooltip";
import { makePointLabel } from "./DataLabel";

export interface RetentionSeries {
  key: string;
  label: string;
  /** Retenção sobre impressões nos pontos [início, 25%, 50%, 75%, 100%]. */
  points: (number | null)[];
}

interface RetentionChartProps {
  series: RetentionSeries[];
  highlightKey: string | null;
  highlightColor: string;
  average: (number | null)[];
  height?: number;
}

const CHART_H = "h-[25vh] min-h-[168px] max-h-[300px]";

const STAGES = ["Início", "25%", "50%", "75%", "100%"];

/** Curva de retenção com ênfase: uma série em destaque, média em navy, demais em cinza de desênfase. */
export function RetentionChart({ series, highlightKey, highlightColor, average, height }: RetentionChartProps) {
  const data = STAGES.map((stage, i) => {
    const row: Record<string, number | string | null> = { stage, __avg: average[i] ?? null };
    for (const s of series) row[s.key] = s.points[i] ?? null;
    return row;
  });
  const pctLabel = (v: number) => fmtPct(v, 1);
  const highlighted = series.find((s) => s.key === highlightKey) ?? null;
  const others = series.filter((s) => s.key !== highlightKey);

  return (
    <div style={height ? { height } : undefined} className={`w-full ${height ? "" : CHART_H}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 22, right: 22, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_CHROME.grid} />
          <XAxis dataKey="stage" tickLine={false} axisLine={{ stroke: CHART_CHROME.axis }} dy={6} />
          <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} width={44} domain={[0, 1]} />
          <Tooltip
            cursor={{ stroke: CHART_CHROME.axis, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload) return null;
              const row = payload[0]?.payload as Record<string, number | null>;
              const rows = [
                ...(highlighted ? [{ label: highlighted.label, value: fmtPct(row[highlighted.key], 1), color: highlightColor }] : []),
                { label: "Média", value: fmtPct(row.__avg, 1), color: TOTAL_COLOR },
                ...others.slice(0, 6).map((o) => ({ label: o.label, value: fmtPct(row[o.key], 1), color: DEEMPHASIS_COLOR })),
              ];
              return <TooltipBox title={String(label)} rows={rows} footer={others.length > 6 ? `+${others.length - 6} outros` : undefined} />;
            }}
          />
          {others.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={DEEMPHASIS_COLOR} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: DEEMPHASIS_COLOR, strokeWidth: 0 }} isAnimationActive={false} connectNulls />
          ))}
          <Line type="monotone" dataKey="__avg" stroke={TOTAL_COLOR} strokeWidth={2} dot={{ r: 3.5, fill: TOTAL_COLOR, stroke: CHART_CHROME.surface, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls>
            {/* rótulos apenas nas duas séries coloridas: os vídeos em cinza ficam no tooltip e na tabela */}
            <LabelList dataKey="__avg" content={makePointLabel({ format: pctLabel, dy: 18, tone: "muted", count: STAGES.length })} />
          </Line>
          {highlighted && (
            <Line
              type="monotone"
              dataKey={highlighted.key}
              stroke={highlightColor}
              strokeWidth={2.5}
              dot={{ r: 4, fill: highlightColor, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
              activeDot={{ r: 5.5 }}
              isAnimationActive={false}
              connectNulls
            >
              <LabelList dataKey={highlighted.key} content={makePointLabel({ format: pctLabel, dy: -11, count: STAGES.length })} />
            </Line>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
