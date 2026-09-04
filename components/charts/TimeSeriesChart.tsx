"use client";

import { Area, AreaChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDayLong, fmtDay } from "@/lib/dates";
import { fmtValue, makeAxisFormatter, type ValueFormat } from "@/lib/format";
import { CHART_CHROME } from "@/lib/palette";
import { TooltipBox } from "./ChartTooltip";
import { makePointLabel } from "./DataLabel";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export interface TimePoint {
  date: string;
  [seriesKey: string]: number | null | string;
}

interface TimeSeriesChartProps {
  data: TimePoint[];
  series: SeriesDef[];
  format: ValueFormat;
  /** Altura fixa em px; por padrão usa altura relativa à viewport. */
  height?: number;
  /** Ocupa toda a altura disponível do card (usado quando a página preenche a viewport). */
  fill?: boolean;
}

/** Altura padrão dos gráficos: acompanha a viewport (bom em 1366×768) com piso e teto. */
export const CHART_H = "h-[25vh] min-h-[168px] max-h-[300px]";

const margin = { top: 22, right: 14, bottom: 4, left: 0 };

/** Linha (ou área para série única) com crosshair + tooltip com todas as séries no X. */
export function TimeSeriesChart({ data, series, format, height, fill = false }: TimeSeriesChartProps) {
  const single = series.length === 1;
  let maxAbs = 0;
  for (const p of data) for (const s of series) {
    const v = p[s.key];
    if (typeof v === "number" && Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  }
  const yTick = makeAxisFormatter(format, maxAbs);
  // o eixo é escala (compacto); o rótulo é valor — em reais, sempre com 2 casas
  const labelFmt = format === "currency" ? (v: number) => fmtValue(v, format) : yTick;
  // Em períodos longos os rótulos são exibidos a cada N pontos para não se sobrepor.
  const labelStep = Math.max(1, Math.ceil(data.length / 12));
  /**
   * Com várias séries, dois valores próximos gerariam rótulos empilhados. Em cada dia
   * os valores são ordenados e alocados acima/abaixo do ponto; o terceiro rótulo muito
   * próximo é omitido (o valor continua no tooltip e na visão em tabela).
   */
  const gap = maxAbs * 0.09;
  const offsets = new Map<string, (number | null)[]>(series.map((s) => [s.key, []]));
  data.forEach((row, i) => {
    const entries = series
      .map((s) => ({ key: s.key, v: typeof row[s.key] === "number" ? (row[s.key] as number) : null }))
      .filter((e): e is { key: string; v: number } => e.v !== null)
      .sort((a, b) => b.v - a.v);
    let lastAbove: number | null = null;
    let lastBelow: number | null = null;
    for (const e of entries) {
      const nearAxis = maxAbs > 0 && e.v < maxAbs * 0.12; // abaixo daqui o rótulo bateria no eixo X
      if (lastAbove === null || lastAbove - e.v >= gap) {
        offsets.get(e.key)![i] = -10;
        lastAbove = e.v;
      } else if (!nearAxis && (lastBelow === null || lastBelow - e.v >= gap)) {
        offsets.get(e.key)![i] = 17;
        lastBelow = e.v;
      } else {
        offsets.get(e.key)![i] = null;
      }
    }
  });
  // null = rótulo omitido de propósito; undefined = série sem entrada nesse índice
  const dyAtFor = (key: string) => (i: number) => {
    const stored = offsets.get(key)?.[i];
    return stored === undefined ? -10 : stored;
  };
  const tooltip = (
    <Tooltip
      cursor={{ stroke: CHART_CHROME.axis, strokeWidth: 1 }}
      content={({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;
        const rows = series
          .map((s) => {
            const p = payload.find((x) => x.dataKey === s.key);
            const v = p?.value as number | null | undefined;
            return { label: s.label, value: fmtValue(v ?? null, format), color: s.color };
          })
          .filter((r) => r.value !== "—" || !single);
        return <TooltipBox title={fmtDayLong(String(label))} rows={rows} />;
      }}
    />
  );
  const xAxis = <XAxis dataKey="date" tickFormatter={fmtDay} tickLine={false} axisLine={{ stroke: CHART_CHROME.axis }} interval="preserveStartEnd" minTickGap={24} dy={6} />;
  const yAxis = <YAxis tickFormatter={yTick} tickLine={false} axisLine={false} width={56} domain={[0, "auto"]} />;
  const grid = <CartesianGrid vertical={false} stroke={CHART_CHROME.grid} />;

  return (
    <div style={height ? { height } : undefined} className={`w-full ${height ? "" : fill ? "h-full min-h-[200px]" : CHART_H}`}>
      <ResponsiveContainer width="100%" height="100%">
        {single ? (
          <AreaChart data={data} margin={margin}>
            <defs>
              <linearGradient id={`wash-${series[0].key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series[0].color} stopOpacity={0.14} />
                <stop offset="100%" stopColor={series[0].color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Area
              type="monotone"
              dataKey={series[0].key}
              stroke={series[0].color}
              strokeWidth={2}
              fill={`url(#wash-${series[0].key})`}
              connectNulls={false}
              dot={{ r: 4, strokeWidth: 2, stroke: CHART_CHROME.surface, fill: series[0].color }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: CHART_CHROME.surface }}
              isAnimationActive={false}
            >
              <LabelList dataKey={series[0].key} content={makePointLabel({ format: labelFmt, step: labelStep, count: data.length })} />
            </Area>
          </AreaChart>
        ) : (
          <LineChart data={data} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                connectNulls={false}
                dot={{ r: 4, strokeWidth: 2, stroke: CHART_CHROME.surface, fill: s.color }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: CHART_CHROME.surface }}
                isAnimationActive={false}
              >
                {/* séries alternam acima/abaixo do ponto: linhas que se cruzam não empilham rótulos */}
                <LabelList dataKey={s.key} content={makePointLabel({ format: labelFmt, step: labelStep, dyAt: dyAtFor(s.key), count: data.length })} />
              </Line>
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
