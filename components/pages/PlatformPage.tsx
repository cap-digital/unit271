"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { groupCreatives, type CreativeGroup } from "@/lib/creatives";
import { eachDay, fmtDay, fmtDayLong } from "@/lib/dates";
import { ageSort, buildKpis, funnelStages, genderSort, retentionPoints, totalSeries } from "@/lib/derive";
import { fmtPct, fmtValue } from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import { aggregate, groupBy, METRICS, metricValue, metricsFor, type MetricKey, type Totals } from "@/lib/metrics";
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
import { PlacePerformanceButton } from "@/components/places/PlacePerformance";
import { DailyTable } from "@/components/pages/DailyTable";
import { KpiGrid } from "@/components/pages/KpiGrid";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Badge, SeriesKey } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricSelect, SimpleSelect } from "@/components/ui/MetricSelect";

const KPI_KEYS: Record<Platform, MetricKey[]> = {
  google: ["investment", "impressions", "clicks", "ctr"],
  youtube: ["investment", "impressions", "engagements", "views"],
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

interface CreativeRow {
  group: CreativeGroup;
  totals: Totals;
}

/** Linha de apoio do criativo: evita repetir o título e lista todos os grupos de anúncios. */
export function creativeSubtitle(g: CreativeGroup): string {
  return [g.title === g.ad ? null : g.ad, ...g.adGroups].filter(Boolean).join(" · ");
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

  // Retenção (YouTube): destaque = anúncio com mais views
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
          description="A campanha MEDX roda apenas em YouTube e TikTok. Desative o switch MEDX no menu para ver o Google na campanha 27.1."
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
          description={`Não há registros ${medx ? "da campanha MEDX" : "da campanha 27.1"} entre ${fmtDay(resolved.start)} e ${fmtDay(resolved.end)}. Ajuste o período no seletor acima.`}
        />
      </Card>
    );
  }

  const stages = platform === "google" ? null : funnelStages(totals, platform);
  const seriesFormat = METRICS[seriesMetric].format;

  const creativeColumns: Column<CreativeRow>[] = [
    {
      key: "creative",
      label: "Anúncio",
      sortValue: (r) => r.group.title,
      render: (r) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <CreativeThumb group={r.group} onClick={() => setOpenCreative(r)} className="h-12 w-16 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <button type="button" onClick={() => setOpenCreative(r)} className="line-clamp-2 text-left font-medium text-ink hover:underline" title={r.group.title}>
              {r.group.title}
            </button>
            {/* título e nome do anúncio são o mesmo campo; a linha de apoio mostra os grupos de anúncios */}
            {creativeSubtitle(r.group) && (
              <p className="truncate text-[11px] text-muted" title={creativeSubtitle(r.group)}>
                {creativeSubtitle(r.group)}
              </p>
            )}
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

  const hasRetention = !!(retention && retention.series.length > 0);
  const hasAudience = !!(audience && audience.ages.length > 0);
  const hasBreakdown = creatives.length > 1;

  const badges = (
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
      {(platform === "google" || platform === "youtube") && (
        <div className="ml-auto">
          <PlacePerformanceButton platform={platform} />
        </div>
      )}
    </div>
  );

  const funnelCard = stages && (
    <ChartCard
      title="Funil de vídeo"
      className="lg:col-span-5"
      subtitle={
        platform === "youtube"
          ? "Quantas visualizações chegaram a cada quartil do vídeo."
          : "Views de 2 s até os quartis do vídeo."
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
  );

  /** No Google a tabela de Desempenho diário fica ao lado, então o gráfico dispensa a visão em tabela. */
  const evolutionCard = (span: string, withTable: boolean, fill = false) => (
    <ChartCard
      title="Evolução diária"
      subtitle={`Métrica selecionada por dia para ${PLATFORM_LABEL[platform]}.`}
      className={span}
      maxBodyHeight={fill ? "none" : undefined}
      controls={<MetricSelect value={seriesMetric} onChange={setSeriesMetric} options={options} />}
      table={
        withTable
          ? {
              columns: [
                { key: "date", label: "Dia" },
                { key: "total", label: METRICS[seriesMetric].label, align: "right" },
              ],
              rows: seriesData.map((p) => ({ date: fmtDayLong(p.date), total: fmtValue(p.total as number | null, seriesFormat) })),
            }
          : undefined
      }
    >
      {days.length < 2 ? (
        <EmptyState compact title="Período de um único dia" description="Amplie o período para ver a evolução diária." />
      ) : (
        <TimeSeriesChart data={seriesData} series={seriesDef} format={seriesFormat} fill={fill} />
      )}
    </ChartCard>
  );

  const creativesCard = (span: string, fill = false) => (
    <Card title="Anúncios" subtitle="Clique no criativo para ver a prévia. Ordene pelas colunas." className={span}>
      <DataTable
        columns={creativeColumns}
        rows={creatives}
        rowKey={(r) => r.group.id}
        initialSort={{ key: "investment", dir: "desc" }}
        footer={creativeFooter}
        maxHeight={fill ? "none" : undefined}
      />
    </Card>
  );

  const dailyCard = (span: string, fill = false) => (
    <DailyTable rows={rows} keys={DAILY_KEYS[platform]} today={today} className={span} maxHeight={fill ? "none" : undefined} />
  );

  const breakdownCard = (span: string) =>
    creatives.length > 1 ? (
      <ChartCard
        title="Comparativo entre anúncios"
        subtitle="Escolha a métrica para ranquear os criativos desta plataforma."
        className={span}
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
    ) : null;

  const retentionCard = hasRetention && retention && (
    <ChartCard
      title="Curva de retenção por anúncio"
      subtitle="Parcela das impressões que segue assistindo em cada quartil. O selecionado fica em destaque; a média em azul-marinho."
      className="lg:col-span-7"
      controls={
        <SimpleSelect
          label="Anúncio em destaque"
          value={effectiveHighlight ?? ""}
          onChange={(v) => setHighlight(v)}
          options={retention.series.map((s) => ({ key: s.key, label: s.label }))}
        />
      }
      legend={
        <>
          <SeriesKey color={PLATFORM_COLOR.youtube} label="Selecionado" />
          <SeriesKey color="#0e2f4f" label="Média" />
          <SeriesKey color="#c9d1db" label="Outros anúncios" />
        </>
      }
      table={{
        columns: [
          { key: "video", label: "Anúncio" },
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
  );

  const audienceCard = (span: string) =>
    hasAudience && audience ? (
    <ChartCard
      title="Público por faixa etária e gênero"
      subtitle="Dimensões de audiência reportadas pelo TikTok. Escolha a métrica para comparar os segmentos."
      className={span}
      controls={<MetricSelect value={audienceMetric} onChange={setAudienceMetric} options={options} />}
      legend={
        <>
          {audience.series.map((s) => (
            <SeriesKey key={s.key} color={s.color} label={s.label} kind="rect" />
          ))}
          {audience.genderTotals.map((g) => (
            <span key={g.key} className="text-[11px] text-muted">
              {g.label}: <strong className="tnum font-semibold text-ink-2">{fmtPct(totals.impressions > 0 ? g.totals.impressions / totals.impressions : null, 1)}</strong> das impressões
            </span>
          ))}
        </>
      }
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
    ) : null;

  // O Google tem menos cards que as outras páginas: a grade estica para terminar
  // na mesma altura do sidebar, em vez de deixar um vazio embaixo.
  const gridClass = platform === "google" ? "lg:flex-1 lg:grid-rows-[auto_auto_minmax(180px,0.85fr)_minmax(220px,1fr)]" : "";

  return (
    <PageGrid className={gridClass}>
      {badges}
      <KpiGrid
        className="lg:col-span-12"
        kpis={kpis}
        hints={
          platform === "tiktok"
            ? { views: "Views de 2 s" }
            : platform === "youtube"
              ? { views: "TrueView", engagements: "Interações no anúncio" }
              : undefined
        }
      />
      <InsightsCard
        insights={insights}
        className={platform === "google" ? "lg:col-span-5" : "lg:col-span-7"}
        maxBodyHeight={platform === "google" ? "none" : undefined}
        singleColumn={platform === "google"}
      />

      {platform === "google" ? (
        <>
          {creativesCard("lg:col-span-7", true)}
          {evolutionCard("lg:col-span-7", false, true)}
          {dailyCard("lg:col-span-5", true)}
          {breakdownCard("lg:col-span-12")}
        </>
      ) : platform === "youtube" ? (
        <>
          {funnelCard}
          {evolutionCard("lg:col-span-12", true)}
          {hasBreakdown ? (
            <>
              {breakdownCard(hasRetention ? "lg:col-span-5" : "lg:col-span-12")}
              {retentionCard}
              {creativesCard("lg:col-span-7")}
              {dailyCard("lg:col-span-5")}
            </>
          ) : (
            /* Com um anúncio só (caso do MEDX) não há comparativo: em vez de deixar
               a coluna da direita vazia, o Desempenho diário ocupa as duas faixas. */
            <>
              {retentionCard}
              {dailyCard("lg:col-span-5 lg:row-span-2", true)}
              {creativesCard("lg:col-span-7")}
            </>
          )}
        </>
      ) : (
        <>
          {funnelCard}
          {evolutionCard("lg:col-span-12", true)}
          {audienceCard("lg:col-span-5")}
          {dailyCard(hasAudience ? "lg:col-span-7" : "lg:col-span-12")}
          {creativesCard("lg:col-span-7")}
          {breakdownCard("lg:col-span-5")}
        </>
      )}

      <CreativePreviewModal group={openCreative?.group ?? null} totals={openCreative?.totals ?? null} onClose={() => setOpenCreative(null)} />
    </PageGrid>
  );
}
