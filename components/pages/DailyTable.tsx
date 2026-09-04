"use client";

import { useMemo } from "react";
import { fmtDayLong } from "@/lib/dates";
import { fmtValue } from "@/lib/format";
import { aggregate, groupBy, METRICS, metricValue, type MetricKey, type Totals } from "@/lib/metrics";
import type { Row } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/tables/DataTable";

interface DailyTableProps {
  rows: Row[];
  keys: MetricKey[];
  today: string;
  title?: string;
  className?: string;
  maxHeight?: number | string;
}

interface DayRow {
  date: string;
  totals: Totals;
}

export function DailyTable({ rows, keys, today, title = "Desempenho diário", className, maxHeight }: DailyTableProps) {
  const data = useMemo<DayRow[]>(() => groupBy(rows, (r) => r.date).map((g) => ({ date: g.key, totals: g.totals })), [rows]);
  const all = useMemo(() => aggregate(rows), [rows]);

  const columns: Column<DayRow>[] = [
    {
      key: "date",
      label: "Data",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium text-ink">
          {fmtDayLong(r.date)}
          {r.date === today && <Badge variant="gold">hoje · parcial</Badge>}
        </span>
      ),
    },
    ...keys.map<Column<DayRow>>((k) => {
      const def = METRICS[k];
      return {
        key: k,
        label: def.short,
        align: "right",
        description: def.description,
        sortValue: (r) => metricValue(k, r.totals),
        render: (r) => fmtValue(metricValue(k, r.totals), def.format),
      };
    }),
  ];

  const footer: Record<string, string> = { date: `Total · ${data.length} dia${data.length === 1 ? "" : "s"}` };
  for (const k of keys) footer[k] = fmtValue(metricValue(k, all), METRICS[k].format);

  return (
    <Card title={title} subtitle="Clique no cabeçalho para ordenar." className={className}>
      <DataTable columns={columns} rows={data} rowKey={(r) => r.date} initialSort={{ key: "date", dir: "desc" }} footer={footer} dense maxHeight={maxHeight} />
    </Card>
  );
}
