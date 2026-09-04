"use client";

import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtDay } from "@/lib/dates";
import { fmtValue } from "@/lib/format";
import { METRICS, metricValue, type MetricKey } from "@/lib/metrics";
import { groupByCity, aggregatePlaces, type PlaceGroup } from "@/lib/places";
import { PLATFORM_LABEL, type PlacePlatform } from "@/lib/types";
import { useDashboard } from "@/store/DashboardContext";
import { MedxSwitch } from "@/components/layout/MedxSwitch";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";

/** Colunas por plataforma — sem Spend: todo custo vem do Investimento. */
const PLACE_KEYS: Record<PlacePlatform, MetricKey[]> = {
  google: ["investment", "impressions", "clicks", "ctr", "cpc", "cpm"],
  youtube: ["investment", "impressions", "views", "vtr", "cpv", "cpm", "clicks"],
};

export function PlacePerformanceButton({ platform }: { platform: PlacePlatform }) {
  const { filteredPlaceRows, dataset, status, refresh, resolved, medx } = useDashboard();
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => filteredPlaceRows.filter((p) => p.platform === platform), [filteredPlaceRows, platform]);
  // um payload em cache anterior às praças não tem a dimensão: enquanto a
  // atualização não volta, isso é carregamento, não ausência de dados
  const hasAnyPlaceData = useMemo(() => (dataset?.placeRows ?? []).some((p) => p.platform === platform), [dataset, platform]);
  const loading = status === "loading" || (status === "refreshing" && !hasAnyPlaceData);
  // o switch só faz sentido onde a plataforma tem as duas campanhas — no Google
  // não há MEDX, e a própria página some nesse modo
  const hasMedx = useMemo(() => (dataset?.placeRows ?? []).some((p) => p.platform === platform && p.isMedx), [dataset, platform]);
  const groups = useMemo(() => groupByCity(rows), [rows]);
  const totals = useMemo(() => aggregatePlaces(rows), [rows]);
  const keys = PLACE_KEYS[platform];

  const columns: Column<PlaceGroup>[] = [
    {
      key: "city",
      label: "Praça",
      minWidth: 170,
      sortValue: (r) => r.city,
      render: (r) => (
        <span className="inline-flex items-center gap-2 font-medium text-ink">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-navy" aria-hidden />
          {r.city}
        </span>
      ),
    },
    {
      key: "share",
      label: "% invest.",
      align: "right",
      description: "Participação da praça no investimento do período.",
      sortValue: (r) => r.totals.investment,
      render: (r) => fmtValue(totals.investment > 0 ? r.totals.investment / totals.investment : null, "pct"),
    },
    ...keys.map<Column<PlaceGroup>>((k) => ({
      key: k,
      label: METRICS[k].short,
      align: "right",
      description: METRICS[k].description,
      sortValue: (r) => metricValue(k, r.totals),
      render: (r) => fmtValue(metricValue(k, r.totals), METRICS[k].format),
    })),
  ];

  const footer: Record<string, string> = {
    city: `Total · ${groups.length} praça${groups.length === 1 ? "" : "s"}`,
    share: groups.length > 0 ? "100%" : "—",
  };
  for (const k of keys) footer[k] = fmtValue(metricValue(k, totals), METRICS[k].format);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-navy px-3 text-[12px] font-semibold text-white shadow-card transition-colors hover:bg-navy-2"
      >
        <MapPin className="h-3.5 w-3.5 text-gold" aria-hidden />
        Desempenho Praça
      </button>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={`Desempenho por praça · ${PLATFORM_LABEL[platform]}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            {resolved.start === resolved.end ? fmtDay(resolved.start) : `${fmtDay(resolved.start)} – ${fmtDay(resolved.end)}`} · clique no cabeçalho para ordenar.
          </p>
          {/* troca de campanha sem sair do modal */}
          {hasMedx && (
            <div className="flex items-center gap-2 rounded-full bg-surface-2 px-2 py-1">
              <span className="text-[11px] font-medium text-muted">{medx ? "Campanha MEDX" : "Campanha 27.1"}</span>
              <MedxSwitch layout="horizontal" />
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center" role="status" aria-live="polite">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-navy">
              <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-ink">Carregando dados de praça…</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">Buscando o recorte por cidade na base de dados.</p>
          </div>
        ) : groups.length === 0 && !hasAnyPlaceData ? (
          <EmptyState
            compact
            title="Dados de praça ainda não disponíveis"
            description="A última carga da base não trouxe o recorte por cidade."
            action={
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-2"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Atualizar agora
              </button>
            }
          />
        ) : groups.length === 0 ? (
          <EmptyState compact title="Sem dados de praça no período" description="Ajuste o período no seletor do topo." />
        ) : (
          <DataTable columns={columns} rows={groups} rowKey={(r) => r.city} initialSort={{ key: "investment", dir: "desc" }} footer={footer} dense maxHeight="55vh" />
        )}
      </Modal>
    </>
  );
}
