"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { useMemo, useState } from "react";
import { groupCreatives, type CreativeGroup } from "@/lib/creatives";
import { fmtDay } from "@/lib/dates";
import { fmtValue } from "@/lib/format";
import { aggregate, METRICS, metricValue, metricsFor, type MetricKey, type Totals } from "@/lib/metrics";
import { PLATFORM_COLOR } from "@/lib/palette";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "@/lib/types";
import { useDashboard } from "@/store/DashboardContext";
import { BarBreakdownChart } from "@/components/charts/BarBreakdownChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { CreativeCard, CreativePreviewModal } from "@/components/creatives/CreativeCard";
import { PageGrid } from "@/components/layout/PageGrid";
import { SeriesKey } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricSelect } from "@/components/ui/MetricSelect";
import { Segmented } from "@/components/ui/Segmented";

interface CreativeRow {
  group: CreativeGroup;
  totals: Totals;
}

type Filter = "all" | Platform;

export default function CreativesPage() {
  const { filteredRows, resolved, medx } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<MetricKey>("investment");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [open, setOpen] = useState<CreativeRow | null>(null);

  const available = useMemo(() => PLATFORMS.filter((p) => filteredRows.some((r) => r.platform === p)), [filteredRows]);
  const effectiveFilter: Filter = filter !== "all" && !available.includes(filter) ? "all" : filter;
  const options = useMemo(() => metricsFor(effectiveFilter === "all" ? "all" : [effectiveFilter]), [effectiveFilter]);
  const effectiveSort: MetricKey = options.some((m) => m.key === sortKey) ? sortKey : "investment";

  const creatives = useMemo<CreativeRow[]>(() => {
    const rows = effectiveFilter === "all" ? filteredRows : filteredRows.filter((r) => r.platform === effectiveFilter);
    return groupCreatives(rows).map((g) => ({ group: g, totals: aggregate(g.rows) }));
  }, [filteredRows, effectiveFilter]);

  const sorted = useMemo(() => {
    const val = (c: CreativeRow) => metricValue(effectiveSort, c.totals);
    return [...creatives].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return dir === "desc" ? vb - va : va - vb;
    });
  }, [creatives, effectiveSort, dir]);

  const def = METRICS[effectiveSort];
  const barData = sorted
    .filter((c) => metricValue(effectiveSort, c.totals) !== null)
    .slice(0, 12)
    .map((c) => ({
      label: c.group.title.length > 30 ? `${c.group.title.slice(0, 28)}…` : c.group.title,
      value: metricValue(effectiveSort, c.totals),
      color: PLATFORM_COLOR[c.group.platform],
      hint: `${PLATFORM_LABEL[c.group.platform]} · ${c.group.ad}`,
    }));

  if (filteredRows.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Sem criativos no período selecionado"
          description={`Não há registros ${medx ? "da campanha MEDX" : "da campanha comum"} entre ${fmtDay(resolved.start)} e ${fmtDay(resolved.end)}.`}
        />
      </Card>
    );
  }

  return (
    <PageGrid>
      <Card className="lg:col-span-12">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Plataforma"
            size="md"
            value={effectiveFilter}
            onChange={setFilter}
            options={[{ key: "all" as Filter, label: "Todas" }, ...available.map((p) => ({ key: p as Filter, label: PLATFORM_LABEL[p] }))]}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-muted">Ordenar por</span>
            <MetricSelect value={effectiveSort} onChange={setSortKey} options={options} />
            <button
              type="button"
              onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface-2 text-ink-2 hover:bg-surface-3"
              aria-label={dir === "desc" ? "Ordem decrescente (clique para crescente)" : "Ordem crescente (clique para decrescente)"}
              title={dir === "desc" ? "Maior → menor" : "Menor → maior"}
            >
              {dir === "desc" ? <ArrowDownWideNarrow className="h-4 w-4" aria-hidden /> : <ArrowUpNarrowWide className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </Card>

      {barData.length > 1 && (
        <ChartCard
          title={`Ranking de criativos por ${def.label.toLowerCase()}`}
          subtitle={`${creatives.length} criativo${creatives.length === 1 ? "" : "s"} no período · cor indica a plataforma${barData.length < sorted.length ? ` · exibindo os ${barData.length} primeiros` : ""}.`}
          className="lg:col-span-12"
          legend={effectiveFilter === "all" ? available.map((p) => <SeriesKey key={p} color={PLATFORM_COLOR[p]} label={PLATFORM_LABEL[p]} kind="rect" />) : undefined}
          table={{
            columns: [
              { key: "label", label: "Criativo" },
              { key: "hint", label: "Plataforma · anúncio" },
              { key: "value", label: def.label, align: "right" },
            ],
            rows: barData.map((d) => ({ label: d.label, hint: d.hint, value: fmtValue(d.value, def.format) })),
          }}
        >
          <BarBreakdownChart data={barData} format={def.format} colorMode="given" valueLabel={def.label} />
        </ChartCard>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-4 2xl:grid-cols-5">
        {sorted.map((c) => (
          <CreativeCard key={c.group.id} group={c.group} totals={c.totals} highlight={effectiveSort} onOpen={() => setOpen(c)} />
        ))}
      </div>

      <CreativePreviewModal group={open?.group ?? null} totals={open?.totals ?? null} onClose={() => setOpen(null)} />
    </PageGrid>
  );
}
