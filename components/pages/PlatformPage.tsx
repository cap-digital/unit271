"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { groupCreatives, type CreativeGroup } from "@/lib/creatives";
import { eachDay, fmtDay, fmtDayLong } from "@/lib/dates";
import { AGE_ORDER, ageSort, buildKpis, funnelStages, genderSort, retentionPoints, totalSeries } from "@/lib/derive";
import { fmtPct, fmtValue } from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import { aggregate, groupBy, METRICS, metricValue, metricsFor, type Group, type MetricKey, type Totals } from "@/lib/metrics";
import { ageLabel, genderLabel } from "@/lib/normalize";
import { GENDER_COLOR, PLATFORM_COLOR } from "@/lib/palette";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import { useDashboard } from "@/store/DashboardContext";
import { BarBreakdownChart } from "@/components/charts/BarBreakdownChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { GroupedBarChart } from "@/components/charts/GroupedBarChart";
import { RetentionChart } from "@/components/charts/RetentionChart";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { CreativePreviewModal, CreativeThumb } from "@/components/creatives/CreativeCard";
import { InsightsCard } from "@/components/insights/InsightsCard";
import { PageGrid } from "@/components/layout/PageGrid";
import { DailyTable } from "@/components/pages/DailyTable";
import { KpiGrid } from "@/components/pages/KpiGrid";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Badge, SeriesKey } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricSelect, SimpleSelect } from "@/components/ui/MetricSelect";

const KPI_KEYS: Record<Platform, MetricKey[]> = {
  google: ["investment", "impressions", "clicks", "ctr"],
  youtube: ["investment", "impressions", "clicks", "views"],
  tiktok: ["investment", "impressions", "clicks", "views"],
};

const DAILY_KEYS: Record<Platform, MetricKey[]> = {
  google: ["investment", "impressions", "clicks", "ctr", "cpc", "cpm", "engagements"],
  youtube: ["investment", "impressions", "views", "vtr", "cpv", "cpm", "p100"],
  tiktok: ["investment", "impressions", "views", "views6s", "vtr", "cpm", "clicks", "ctr"],
};

const CREATIVE_TABLE_KEYS: Record<Platform, MetricKey[]> = {
  google: ["investment", "impressions", "clicks", "ctr", "cpc", "cpm", "engagements"],
  youtube: ["investment", "impressions", "views", "vtr", "cpv", "p100", "completion"],
  tiktok: ["investment", "impressions", "views", "vtr", "cpm", "clicks", "ctr"],
};

const AGE_TABLE_KEYS: MetricKey[] = ["investment", "impressions", "views", "vtr", "cpm", "clicks", "ctr"];

interface CreativeRow {
  group: CreativeGroup;
  totals: Totals;
}

type AgeGroup = Group<string>;

function ageColumns(totals: Totals): Column<AgeGroup>[] {
  return [
    {
      key: "age",
      label: "Faixa etária",
      sortValue: (r) => {
        const i = AGE_ORDER.indexOf(r.key);
        return i === -1 ? 99 : i;
      },
      render: (r) => <span className="font-medium text-ink">{r.label}</span>,
    },
    {
      key: "share",
      label: "% impressões",
      align: "right",
      sortValue: (r) => r.totals.impressions,
      render: (r) => fmtPct(totals.impressions > 0 ? r.totals.impressions / totals.impressions : null, 1),
    },
    ...AGE_TABLE_KEYS.map<Column<AgeGroup>>((k) => ({
      key: k,
      label: METRICS[k].short,
      align: "right",
      description: METRICS[k].description,
      sortValue: (r) => metricValue(k, r.totals),
      render: (r) => fmtValue(metricValue(k, r.totals), METRICS[k].format),
    })),
  ];
}

export function PlatformPage({ platform }: { platform: Platform }) {
  const { filteredRows, previousRows, resolved, range, today, medx } = useDashboard();
  const [seriesMetric, setSeriesMetric] = useState<MetricKey>("investment");
  const [breakdownMetric, setBreakdownMetric] = useState<MetricKey>("impressions");
  const [audienceMetric, setAudienceMetric] = useState<MetricKey>("impressions");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [openCreative, setOpenCreative] = useState<CreativeRow | null>(null);

  const rows = useMemo(() => filteredRows.filter((r) => r.platform === platform), [filteredRows, platform]);
  const prev = useMemo(() => previousRows.filter((r) => r.platform === platform), [previousRows, platform]);
  const days = useMemo(() => eachDay(resolved.start, resolved.end), [resolved]);
  const withDelta = range.preset !== "all" && prev.length > 0;
  const kpis = useMemo(() => buildKpis(rows, prev, days, KPI_KEYS[platform], withDelta), [rows, prev, days, platform, withDelta]);
  const totals = useMemo(() => aggregate(rows), [rows]);
  const insights = useMemo(() => buildInsights({ rows, platform, today }), [rows, platform, today]);
  const options = useMemo(() => metricsFor([platform]), [platform]);

  const seriesData = useMemo(() => totalSeries(rows, days, seriesMetric), [rows, days, seriesMetric]);
  const seriesDef = useMemo(() => [{ key: "total", label: PLATFORM_LABEL[platform], color: PLATFORM_COLOR[platform] }], [platform]);

  const creatives = useMemo<CreativeRow[]>(() => groupCreatives(rows).map((g) => ({ group: g, totals: aggregate(g.rows) })), [rows]);
  const campaigns = useMemo(() => [...new Set(rows.map((r) => r.campaign))], [rows]);
  const adGroups = useMemo(() => [...new Set(rows.map((r) => r.adGroup).filter(Boolean))], [rows]);

  // Retenção (YouTube): destaque = vídeo com mais views
  const retention = useMemo(() => {
    if (platform !== "youtube") return null;
    const series = creatives
      .filter((c) => c.totals.impressions > 0)
      .map((c) => ({ key: c.group.id, label: c.group.title, points: retentionPoints(c.totals), views: c.totals.views }))
      .sort((a, b) => b.views - a.views);
    const avg = retentionPoints(totals);
    return { series, avg };
  }, [platform, creatives, totals]);
  const effectiveHighlight = highlight && retention?.series.some((s) => s.key === highlight) ? highlight : (retention?.series[0]?.key ?? null);

  // Público (TikTok)
  const audience = useMemo(() => {
    if (platform !== "tiktok") return null;
    const ages = groupBy(rows, (r) => r.age ?? "NONE", (k) => ageLabel(k === "NONE" ? null : k)).sort((a, b) => ageSort(a.key, b.key));
    const genders = [...new Set(rows.map((r) => r.gender ?? "NONE"))].sort(genderSort);
    const data = ages.map((a) => {
      const point: Record<string, number | null | string> = { category: a.label };
      for (const g of genders) point[g] = metricValue(audienceMetric, aggregate(a.rows.filter((r) => (r.gender ?? "NONE") === g)));
      return point;
    });
    const series = genders.map((g) => ({ key: g, label: genderLabel(g), color: GENDER_COLOR[g] ?? GENDER_COLOR.NONE }));
    const genderTotals = groupBy(rows, (r) => r.gender ?? "NONE", (k) => genderLabel(k)).sort((a, b) => genderSort(a.key, b.key));
    return { ages, genders, data, series, genderTotals };
  }, [platform, rows, audienceMetric]);

  if (medx && platform === "google") {
    return (
      <Card>
        <EmptyState
          title="Google não faz parte da campanha MEDX"
          description="A campanha MEDX roda apenas em YouTube e TikTok. Desative o switch MEDX no menu para ver a campanha comum do Google."
          action={
            <Link href="/" className="inline-flex h-9 items-center rounded-full bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-2">
              Ir para a visão geral
            </Link>
          }
        />
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          title={`Sem dados de ${PLATFORM_LABEL[platform]} no período`}
          description={`Não há registros ${medx ? "da campanha MEDX" : "da campanha comum"} entre ${fmtDay(resolved.start)} e ${fmtDay(resolved.end)}. Ajuste o período no seletor acima.`}
        />
      </Card>
    );
  }

  const stages = funnelStages(totals, platform);
  const seriesFormat = METRICS[seriesMetric].format;

  const creativeColumns: Column<CreativeRow>[] = [
    {
      key: "creative",
      label: platform === "youtube" ? "Vídeo" : "Anúncio",
      sortValue: (r) => r.group.title,
      render: (r) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <CreativeThumb group={r.group} onClick={() => setOpenCreative(r)} className="h-12 w-16 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <button type="button" onClick={() => setOpenCreative(r)} className="line-clamp-2 text-left font-medium text-ink hover:underline" title={r.group.title}>
              {r.group.title}
            </button>
            <p className="truncate text-[11px] text-muted" title={r.group.ad}>
              {r.group.ad}
            </p>
          </div>
        </div>
      ),
    },
    ...CREATIVE_TABLE_KEYS[platform].map<Column<CreativeRow>>((k) => ({
      key: k,
      label: METRICS[k].short,
      align: "right",
      description: METRICS[k].description,
      sortValue: (r) => metricValue(k, r.totals),
      render: (r) => fmtValue(metricValue(k, r.totals), METRICS[k].format),
    })),
  ];
  const creativeFooter: Record<string, string> = { creative: `Total · ${creatives.length}` };
  for (const k of CREATIVE_TABLE_KEYS[platform]) creativeFooter[k] = fmtValue(metricValue(k, totals), METRICS[k].format);

  const breakdownData = [...creatives]
    .map((c) => ({ label: c.group.title.length > 34 ? `${c.group.title.slice(0, 32)}…` : c.group.title, value: metricValue(breakdownMetric, c.totals), hint: c.group.ad }))
    .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));

  return (
    <PageGrid>
      <div className="flex flex-wrap items-center gap-2 px-1 lg:col-span-12">
        <Badge variant="navy">{PLATFORM_LABEL[platform]}</Badge>
        {campaigns.map((c) => (
          <Badge key={c} variant="outline" className="max-w-full truncate">
            {c}
          </Badge>
        ))}
        {adGroups.map((g) => (
          <Badge key={g} variant="muted" className="max-w-full truncate">
            {g}
          </Badge>
        ))}
      </div>

      <KpiGrid
        className="lg:col-span-12"
        kpis={kpis}
        hints={platform === "tiktok" ? { views: "Views de 2 s" } : platform === "youtube" ? { views: "TrueView" } : undefined}
      />

      <InsightsCard insights={insights} className="lg:col-span-7" />

      <ChartCard
        title={platform === "google" ? "Funil de cliques" : "Funil de vídeo"}
        className="lg:col-span-5"
        subtitle={
          platform === "google"
            ? "Impressões → cliques → engajamentos."
            : platform === "youtube"
              ? "Quantas impressões chegaram a 25 / 50 / 75 / 100% do vídeo."
              : "Impressões → views de 2 s → 6 s → quartis do vídeo."
        }
        table={{
          columns: [
            { key: "stage", label: "Etapa" },
            { key: "value", label: "Volume", align: "right" },
            { key: "share", label: "% do topo", align: "right" },
          ],
          rows: stages.map((s) => ({ stage: s.label, value: fmtValue(s.value, "int"), share: fmtValue(stages[0].value > 0 ? s.value / stages[0].value : null, "pct") })),
        }}
      >
        <FunnelChart stages={stages} />
      </ChartCard>

      <ChartCard
        title="Evolução diária"
        subtitle={`Métrica selecionada por dia para ${PLATFORM_LABEL[platform]}.`}
        className="lg:col-span-12"
        controls={<MetricSelect value={seriesMetric} onChange={setSeriesMetric} options={options} />}
        table={{
          columns: [
            { key: "date", label: "Dia" },
            { key: "total", label: METRICS[seriesMetric].label, align: "right" },
          ],
          rows: seriesData.map((p) => ({ date: fmtDayLong(p.date), total: fmtValue(p.total as number | null, seriesFormat) })),
        }}
      >
        {days.length < 2 ? (
          <EmptyState compact title="Período de um único dia" description="Amplie o período para ver a evolução diária." />
        ) : (
          <TimeSeriesChart data={seriesData} series={seriesDef} format={seriesFormat} />
        )}
      </ChartCard>

      {retention && retention.series.length > 0 && (
        <ChartCard
          title="Curva de retenção por vídeo"
          subtitle="Parcela das impressões que segue assistindo em cada quartil. O selecionado fica em destaque; a média em azul-marinho."
          className="lg:col-span-7"
          controls={
            <SimpleSelect
              label="Vídeo em destaque"
              value={effectiveHighlight ?? ""}
              onChange={(v) => setHighlight(v)}
              options={retention.series.map((s) => ({ key: s.key, label: s.label }))}
            />
          }
          legend={
            <>
              <SeriesKey color={PLATFORM_COLOR.youtube} label="Selecionado" />
              <SeriesKey color="#0e2f4f" label="Média" />
              <SeriesKey color="#c9d1db" label="Outros vídeos" />
            </>
          }
          table={{
            columns: [
              { key: "video", label: "Vídeo" },
              { key: "p25", label: "25%", align: "right" },
              { key: "p50", label: "50%", align: "right" },
              { key: "p75", label: "75%", align: "right" },
              { key: "p100", label: "100%", align: "right" },
            ],
            rows: [
              ...retention.series.map((s) => ({ video: s.label, p25: fmtPct(s.points[1], 1), p50: fmtPct(s.points[2], 1), p75: fmtPct(s.points[3], 1), p100: fmtPct(s.points[4], 1) })),
              { video: "Média", p25: fmtPct(retention.avg[1], 1), p50: fmtPct(retention.avg[2], 1), p75: fmtPct(retention.avg[3], 1), p100: fmtPct(retention.avg[4], 1) },
            ],
          }}
        >
          <RetentionChart series={retention.series} highlightKey={effectiveHighlight} highlightColor={PLATFORM_COLOR.youtube} average={retention.avg} />
        </ChartCard>
      )}

      {audience && audience.ages.length > 0 && (
        <>
          <ChartCard
            title="Público por faixa etária e gênero"
            subtitle="Dimensões de audiência reportadas pelo TikTok. Escolha a métrica para comparar os segmentos."
            className="lg:col-span-7"
            controls={<MetricSelect value={audienceMetric} onChange={setAudienceMetric} options={options} />}
            legend={audience.series.map((s) => (
              <SeriesKey key={s.key} color={s.color} label={s.label} kind="rect" />
            ))}
            table={{
              columns: [{ key: "category", label: "Faixa" }, ...audience.series.map((s) => ({ key: s.key, label: s.label, align: "right" as const }))],
              rows: audience.data.map((d) => {
                const row: Record<string, string> = { category: String(d.category) };
                for (const s of audience.series) row[s.key] = fmtValue(d[s.key] as number | null, METRICS[audienceMetric].format);
                return row;
              }),
            }}
          >
            <GroupedBarChart data={audience.data as { category: string; [k: string]: number | null | string }[]} series={audience.series} format={METRICS[audienceMetric].format} />
          </ChartCard>

          <Card title="Faixas etárias em detalhe" subtitle="Participação nas impressões e eficiência por faixa. Ordene clicando no cabeçalho." className="lg:col-span-12">
            <DataTable
              columns={ageColumns(totals)}
              rows={audience.ages}
              rowKey={(r) => r.key}
              initialSort={{ key: "share", dir: "desc" }}
              footer={Object.fromEntries([["age", "Total"], ["share", "100%"], ...AGE_TABLE_KEYS.map((k) => [k, fmtValue(metricValue(k, totals), METRICS[k].format)])])}
              dense
             
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {audience.genderTotals.map((g) => (
                <span key={g.key} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] text-ink-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: GENDER_COLOR[g.key] ?? GENDER_COLOR.NONE }} aria-hidden />
                  {g.label}: <strong className="tnum font-semibold text-ink">{fmtPct(totals.impressions > 0 ? g.totals.impressions / totals.impressions : null, 1)}</strong> das impressões
                </span>
              ))}
            </div>
          </Card>
        </>
      )}

      {creatives.length > 1 && (
        <ChartCard
          title={platform === "youtube" ? "Comparativo entre vídeos" : "Comparativo entre anúncios"}
          subtitle="Escolha a métrica para ranquear os criativos desta plataforma."
          className={retention || audience ? "lg:col-span-5" : "lg:col-span-12"}
          controls={<MetricSelect value={breakdownMetric} onChange={setBreakdownMetric} options={options} />}
          table={{
            columns: [
              { key: "label", label: "Criativo" },
              { key: "value", label: METRICS[breakdownMetric].label, align: "right" },
            ],
            rows: breakdownData.map((d) => ({ label: d.label, value: fmtValue(d.value, METRICS[breakdownMetric].format) })),
          }}
        >
          <BarBreakdownChart data={breakdownData} format={METRICS[breakdownMetric].format} valueLabel={METRICS[breakdownMetric].label} />
        </ChartCard>
      )}

      <Card title={platform === "youtube" ? "Vídeos" : "Anúncios"} subtitle="Clique no criativo para ver a prévia. Ordene pelas colunas." className="lg:col-span-7">
        <DataTable columns={creativeColumns} rows={creatives} rowKey={(r) => r.group.id} initialSort={{ key: "investment", dir: "desc" }} footer={creativeFooter} />
      </Card>

      <DailyTable rows={rows} keys={DAILY_KEYS[platform]} today={today} className="lg:col-span-5" />

      <CreativePreviewModal group={openCreative?.group ?? null} totals={openCreative?.totals ?? null} onClose={() => setOpenCreative(null)} />
    </PageGrid>
  );
}
