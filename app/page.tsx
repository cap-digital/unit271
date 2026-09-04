"use client";

import { useMemo, useState } from "react";
import { eachDay, fmtDay, fmtDayLong } from "@/lib/dates";
import { buildKpis, funnelStages, platformSeries, platformSeriesDefs, TOTAL_SERIES, totalSeries } from "@/lib/derive";
import { fmtValue } from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import { aggregate, groupBy, METRICS, metricValue, metricsFor, type MetricKey, type Totals } from "@/lib/metrics";
import { PLATFORM_COLOR } from "@/lib/palette";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "@/lib/types";
import { useDashboard } from "@/store/DashboardContext";
import { ChartCard } from "@/components/charts/ChartCard";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ShareBars } from "@/components/charts/ShareBars";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { InsightsCard } from "@/components/insights/InsightsCard";
import { PageGrid } from "@/components/layout/PageGrid";
import { KpiGrid } from "@/components/pages/KpiGrid";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { PlatformBadge, SeriesKey } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricSelect } from "@/components/ui/MetricSelect";
import { Segmented } from "@/components/ui/Segmented";

const KPI_KEYS: MetricKey[] = ["investment", "impressions", "clicks", "views"];
const SHARE_KEYS: MetricKey[] = ["investment", "impressions", "clicks", "views"];
const TABLE_KEYS: MetricKey[] = ["investment", "impressions", "clicks", "views", "cpm", "cpc", "ctr", "vtr", "cpv"];

interface PlatformRow {
  platform: Platform;
  campaigns: string[];
  totals: Totals;
}

export default function OverviewPage() {
  const { filteredRows, previousRows, resolved, range, today, medx } = useDashboard();
  const [seriesMetric, setSeriesMetric] = useState<MetricKey>("investment");
  const [seriesMode, setSeriesMode] = useState<"total" | "platform">("platform");

  const days = useMemo(() => eachDay(resolved.start, resolved.end), [resolved]);
  const withDelta = range.preset !== "all" && previousRows.length > 0;
  const kpis = useMemo(() => buildKpis(filteredRows, previousRows, days, KPI_KEYS, withDelta), [filteredRows, previousRows, days, withDelta]);
  const insights = useMemo(() => buildInsights({ rows: filteredRows, platform: "all", today }), [filteredRows, today]);
  const totals = useMemo(() => aggregate(filteredRows), [filteredRows]);

  const activePlatforms = useMemo(() => PLATFORMS.filter((p) => filteredRows.some((r) => r.platform === p)), [filteredRows]);
  const seriesData = useMemo(
    () => (seriesMode === "total" ? totalSeries(filteredRows, days, seriesMetric) : platformSeries(filteredRows, days, seriesMetric, activePlatforms)),
    [filteredRows, days, seriesMetric, seriesMode, activePlatforms],
  );
  const seriesDefs = seriesMode === "total" ? TOTAL_SERIES : platformSeriesDefs(activePlatforms);
  const seriesFormat = METRICS[seriesMetric].format;

  const platformRows = useMemo<PlatformRow[]>(
    () =>
      groupBy(filteredRows, (r) => r.platform).map((g) => ({
        platform: g.key as Platform,
        campaigns: [...new Set(g.rows.map((r) => r.campaign))],
        totals: g.totals,
      })),
    [filteredRows],
  );

  const shareRows = useMemo(
    () =>
      SHARE_KEYS.map((k) => ({
        label: METRICS[k].label,
        format: METRICS[k].format,
        segments: platformRows.map((p) => ({ key: p.platform, label: PLATFORM_LABEL[p.platform], color: PLATFORM_COLOR[p.platform], value: metricValue(k, p.totals) ?? 0 })),
      })).filter((r) => r.segments.some((s) => s.value > 0)),
    [platformRows],
  );

  if (filteredRows.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Sem dados para o período selecionado"
          description={`Não há registros ${medx ? "da campanha MEDX" : "da campanha 27.1"} entre ${fmtDay(resolved.start)} e ${fmtDay(resolved.end)}. Ajuste o período no seletor acima.`}
        />
      </Card>
    );
  }

  const platformColumns: Column<PlatformRow>[] = [
    {
      key: "platform",
      label: "Plataforma",
      sortValue: (r) => PLATFORM_LABEL[r.platform],
      render: (r) => (
        <div className="flex min-w-[190px] items-center gap-2">
          <PlatformBadge platform={r.platform} />
          <span className="max-w-[190px] truncate text-[11px] text-muted" title={r.campaigns.join(" · ")}>
            {r.campaigns.join(" · ")}
          </span>
        </div>
      ),
    },
    ...TABLE_KEYS.map<Column<PlatformRow>>((k) => ({
      key: k,
      label: METRICS[k].short,
      align: "right",
      description: METRICS[k].description,
      sortValue: (r) => metricValue(k, r.totals),
      render: (r) => fmtValue(metricValue(k, r.totals), METRICS[k].format),
    })),
  ];
  const platformFooter: Record<string, string> = { platform: "Total" };
  for (const k of TABLE_KEYS) platformFooter[k] = fmtValue(metricValue(k, totals), METRICS[k].format);

  const seriesTable = {
    columns: [{ key: "date", label: "Dia" }, ...seriesDefs.map((s) => ({ key: s.key, label: s.label, align: "right" as const }))],
    rows: seriesData.map((p) => {
      const row: Record<string, string> = { date: fmtDayLong(p.date) };
      for (const s of seriesDefs) row[s.key] = fmtValue(p[s.key] as number | null, seriesFormat);
      return row;
    }),
  };

  const stages = funnelStages(totals, "all");

  return (
    <PageGrid>
      <KpiGrid kpis={kpis} hints={{ views: "YouTube TrueView + TikTok 2 s" }} className="lg:col-span-12" />

      <InsightsCard insights={insights} className="lg:col-span-7" />

      <ChartCard
        title="Participação por plataforma"
        subtitle="Como cada plataforma contribui em investimento, impressões, cliques e visualizações."
        className="lg:col-span-5"
        table={{
          columns: [{ key: "metric", label: "Métrica" }, ...platformRows.map((p) => ({ key: p.platform, label: PLATFORM_LABEL[p.platform], align: "right" as const }))],
          rows: SHARE_KEYS.map((k) => {
            const row: Record<string, string> = { metric: METRICS[k].label };
            for (const p of platformRows) row[p.platform] = fmtValue(metricValue(k, p.totals), METRICS[k].format);
            return row;
          }),
        }}
      >
        <ShareBars rows={shareRows} legend={platformRows.map((p) => ({ key: p.platform, label: PLATFORM_LABEL[p.platform], color: PLATFORM_COLOR[p.platform] }))} />
      </ChartCard>

      <ChartCard
        title="Evolução diária"
        subtitle="Escolha a métrica e veja o total ou a comparação entre plataformas."
        className="lg:col-span-12"
        controls={
          <>
            <MetricSelect value={seriesMetric} onChange={setSeriesMetric} options={metricsFor("all")} />
            <Segmented
              label="Modo da série"
              value={seriesMode}
              onChange={setSeriesMode}
              options={[
                { key: "platform", label: "Por plataforma" },
                { key: "total", label: "Total" },
              ]}
            />
          </>
        }
        legend={seriesDefs.length > 1 ? seriesDefs.map((s) => <SeriesKey key={s.key} color={s.color} label={s.label} />) : undefined}
        table={seriesTable}
      >
        {days.length < 2 ? (
          <EmptyState compact title="Período de um único dia" description="Amplie o período para ver a evolução diária. Os totais do dia estão nos cartões acima." />
        ) : (
          <TimeSeriesChart data={seriesData} series={seriesDefs} format={seriesFormat} />
        )}
      </ChartCard>

      <ChartCard
        title="Funil de atenção"
        subtitle="Impressões → visualizações de vídeo (YouTube + TikTok) → cliques em todas as plataformas."
        className="lg:col-span-5"
        table={{
          columns: [
            { key: "stage", label: "Etapa" },
            { key: "value", label: "Volume", align: "right" },
            { key: "share", label: "% do topo", align: "right" },
          ],
          rows: stages.map((s) => {
            const base = s.base ? s.base.value : stages[0].value;
            return { stage: s.base ? `${s.label} (% sobre ${s.base.label})` : s.label, value: fmtValue(s.value, "int"), share: fmtValue(base > 0 ? s.value / base : null, "pct") };
          }),
        }}
      >
        <FunnelChart stages={stages} />
      </ChartCard>

      <Card title="Comparativo entre plataformas" subtitle="Clique no cabeçalho para ordenar." className="lg:col-span-7">
        <DataTable columns={platformColumns} rows={platformRows} rowKey={(r) => r.platform} initialSort={{ key: "investment", dir: "desc" }} footer={platformFooter} />
      </Card>

    </PageGrid>
  );
}
