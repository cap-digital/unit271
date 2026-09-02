"use client";

import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { diffDays, fmtDateBR } from "@/lib/dates";
import { fmtCurrency, fmtInt, fmtPct } from "@/lib/format";
import { impliedUnitCost } from "@/lib/goals";
import { aggregate, METRICS, metricValue, type Totals } from "@/lib/metrics";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import { useDashboard } from "@/store/DashboardContext";
import { GoalCard, pacing, StatusChip } from "@/components/goals/GoalCard";
import { GoalEditor } from "@/components/goals/GoalEditor";
import { PageGrid } from "@/components/layout/PageGrid";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { PlatformBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

const ORDER: Platform[] = ["tiktok", "youtube", "google"];

interface SummaryRow {
  platform: Platform;
  totals: Totals;
  metricLabel: string;
  kpiActual: number;
  kpiTarget: number;
  kpiPct: number;
  invActual: number;
  invTarget: number;
  invPct: number;
  unitLabel: string;
  unitTarget: number | null;
  unitActual: number | null;
  status: ReturnType<typeof pacing>["status"];
}

export default function GoalsPage() {
  const { scopedRows, goals, activeGoals, setGoals, resetGoals, medx, today } = useDashboard();
  const [editing, setEditing] = useState(false);

  const { periodStart, periodEnd } = goals;
  const periodRows = useMemo(() => scopedRows.filter((r) => r.date >= periodStart && r.date <= periodEnd), [scopedRows, periodStart, periodEnd]);
  const totalDays = Math.max(1, diffDays(periodStart, periodEnd) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(0, diffDays(periodStart, today) + 1));
  const elapsedPct = elapsedDays / totalDays;

  const platforms = ORDER.filter((p) => !!activeGoals[p]);

  const summary = useMemo<SummaryRow[]>(
    () =>
      platforms.map((p) => {
        const goal = activeGoals[p]!;
        const totals = aggregate(periodRows.filter((r) => r.platform === p));
        const kpiActual = metricValue(goal.metric, totals) ?? 0;
        const unit = impliedUnitCost(goal);
        const pace = pacing(kpiActual, goal.target, elapsedDays, totalDays);
        return {
          platform: p,
          totals,
          metricLabel: METRICS[goal.metric].label,
          kpiActual,
          kpiTarget: goal.target,
          kpiPct: goal.target > 0 ? kpiActual / goal.target : 0,
          invActual: totals.investment,
          invTarget: goal.investment,
          invPct: goal.investment > 0 ? totals.investment / goal.investment : 0,
          unitLabel: unit.label,
          unitTarget: unit.value,
          unitActual: metricValue(unit.key, totals),
          status: pace.status,
        };
      }),
    [platforms, activeGoals, periodRows, elapsedDays, totalDays],
  );

  const totalInvTarget = summary.reduce((a, r) => a + r.invTarget, 0);
  const totalInvActual = summary.reduce((a, r) => a + r.invActual, 0);

  const columns: Column<SummaryRow>[] = [
    { key: "platform", label: "Plataforma", sortValue: (r) => PLATFORM_LABEL[r.platform], render: (r) => <PlatformBadge platform={r.platform} /> },
    { key: "status", label: "Status", sortValue: (r) => r.kpiPct, render: (r) => <StatusChip status={r.status} /> },
    { key: "metric", label: "Meta principal", render: (r) => <span className="text-ink-2">{r.metricLabel}</span> },
    { key: "kpi", label: "Realizado / meta", align: "right", sortValue: (r) => r.kpiPct, render: (r) => `${fmtInt(r.kpiActual)} / ${fmtInt(r.kpiTarget)}` },
    { key: "kpiPct", label: "% meta", align: "right", sortValue: (r) => r.kpiPct, render: (r) => <strong className="font-semibold text-ink">{fmtPct(r.kpiPct, 1)}</strong> },
    { key: "inv", label: "Investimento / meta", align: "right", sortValue: (r) => r.invPct, render: (r) => `${fmtCurrency(r.invActual)} / ${fmtCurrency(r.invTarget)}` },
    { key: "invPct", label: "% invest.", align: "right", sortValue: (r) => r.invPct, render: (r) => fmtPct(r.invPct, 1) },
    {
      key: "unit",
      label: "Custo unit. atual / meta",
      align: "right",
      sortValue: (r) => (r.unitActual !== null && r.unitTarget ? r.unitActual / r.unitTarget : null),
      render: (r) => (
        <span>
          <span className="text-[11px] text-muted">{r.unitLabel} </span>
          <span className={r.unitActual !== null && r.unitTarget !== null ? (r.unitActual <= r.unitTarget ? "text-good-text" : "text-crit") : ""}>{fmtCurrency(r.unitActual)}</span>
          <span className="text-muted"> / {fmtCurrency(r.unitTarget)}</span>
        </span>
      ),
    },
  ];

  return (
    <PageGrid>
      <Card
        className="lg:col-span-12"
        title={`Metas · ${medx ? "MEDX" : "campanha comum"}`}
        subtitle={`Período de ${fmtDateBR(periodStart)} a ${fmtDateBR(periodEnd)} · acumulado desde o início do período (não usa o filtro de datas do topo).`}
        actions={
          <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-[13px] font-medium text-ink hover:bg-surface-3">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Editar metas
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Período decorrido" value={`${Math.round(elapsedPct * 100)}%`} hint={`${elapsedDays} de ${totalDays} dias`} />
          <Tile label="Dias restantes" value={fmtInt(Math.max(0, totalDays - elapsedDays))} hint={`até ${fmtDateBR(periodEnd)}`} />
          <Tile label="Investimento realizado" value={fmtCurrency(totalInvActual, { compact: true })} hint={`de ${fmtCurrency(totalInvTarget, { compact: true })} (${fmtPct(totalInvTarget > 0 ? totalInvActual / totalInvTarget : null, 1)})`} />
          <Tile label="Plataformas com meta" value={String(platforms.length)} hint={platforms.map((p) => PLATFORM_LABEL[p]).join(" · ") || "—"} />
        </div>
      </Card>

      {platforms.length === 0 ? (
        <Card className="lg:col-span-12">
          <EmptyState title="Nenhuma meta configurada para este modo" description="Use “Editar metas” para definir investimento e meta principal por plataforma." />
        </Card>
      ) : (
        <>
          {summary.map((s) => (
            <GoalCard
              key={s.platform}
              className={platforms.length >= 3 ? "lg:col-span-4" : "lg:col-span-6"}
              platform={s.platform}
              goal={activeGoals[s.platform]!}
              totals={s.totals}
              periodStart={periodStart}
              periodEnd={periodEnd}
              today={today}
              campaigns={Array.from(new Set(periodRows.filter((r) => r.platform === s.platform).map((r) => r.campaign)))}
            />
          ))}

          <Card title="Resumo das metas" subtitle="Status calculado comparando o percentual atingido com o percentual do período decorrido." className="lg:col-span-12">
            <DataTable columns={columns} rows={summary} rowKey={(r) => r.platform} initialSort={{ key: "kpiPct", dir: "desc" }} />
          </Card>
        </>
      )}

      <GoalEditor open={editing} onClose={() => setEditing(false)} goals={goals} mode={medx ? "medx" : "normal"} onSave={setGoals} onReset={resetGoals} />
    </PageGrid>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="text-[20px] font-semibold leading-tight text-ink">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted" title={hint}>{hint}</p>}
    </div>
  );
}
