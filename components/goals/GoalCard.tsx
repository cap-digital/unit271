"use client";

import { CheckCircle2, CircleAlert, CircleDashed, Gauge } from "lucide-react";
import { diffDays } from "@/lib/dates";
import { fmtCurrency, fmtInt, fmtPct, fmtValue } from "@/lib/format";
import { impliedUnitCost, type PlatformGoal } from "@/lib/goals";
import { METRICS, metricValue, type Totals } from "@/lib/metrics";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import { PlatformBadge } from "@/components/ui/Badge";

export type PaceStatus = "done" | "on" | "warn" | "late" | "idle";

export interface Pacing {
  achieved: number; // 0..∞
  expected: number; // 0..1 (fração do período decorrida)
  status: PaceStatus;
  projected: number | null;
  perDayNeeded: number | null;
}

/**
 * `elapsedDays` inclui o dia em andamento (base da projeção); `completedDays`
 * conta só dias fechados e define o ritmo esperado, para o dia parcial não
 * marcar a meta como atrasada logo cedo.
 */
export function pacing(actual: number, target: number, elapsedDays: number, totalDays: number, completedDays = elapsedDays): Pacing {
  const achieved = target > 0 ? actual / target : 0;
  const expected = totalDays > 0 ? Math.min(1, Math.max(0, completedDays / totalDays)) : 0;
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const projected = elapsedDays > 0 ? (actual / elapsedDays) * totalDays : null;
  const perDayNeeded = remainingDays > 0 ? Math.max(0, target - actual) / remainingDays : null;
  let status: PaceStatus = "idle";
  if (achieved >= 1) status = "done";
  else if (elapsedDays <= 0 || target <= 0) status = "idle";
  else {
    const ratio = expected > 0 ? achieved / expected : 0;
    status = ratio >= 0.9 ? "on" : ratio >= 0.65 ? "warn" : "late";
  }
  return { achieved, expected, status, projected, perDayNeeded };
}

const STATUS_META: Record<PaceStatus, { label: string; fill: string; track: string; text: string; Icon: typeof Gauge }> = {
  done: { label: "Meta atingida", fill: "#0ca30c", track: "#eaf6ea", text: "text-good-text", Icon: CheckCircle2 },
  on: { label: "No ritmo", fill: "#0e2f4f", track: "#e6edf5", text: "text-navy", Icon: Gauge },
  warn: { label: "Atenção", fill: "#fab219", track: "#fdf1d6", text: "text-warn-text", Icon: CircleAlert },
  late: { label: "Atrasado", fill: "#d03b3b", track: "#fdeaea", text: "text-crit", Icon: CircleAlert },
  idle: { label: "Aguardando", fill: "#9aa4b2", track: "#eef1f5", text: "text-muted", Icon: CircleDashed },
};

export function StatusChip({ status }: { status: PaceStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.text}`} style={{ background: m.track }}>
      <m.Icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

interface MeterProps {
  label: string;
  actualText: string;
  targetText: string;
  pace: Pacing;
  projectedText: string | null;
  perDayText: string | null;
}

function Meter({ label, actualText, targetText, pace, projectedText, perDayText }: MeterProps) {
  const m = STATUS_META[pace.status];
  const pct = Math.min(1, pace.achieved);
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[12px] font-medium text-muted">{label}</p>
          <p className="text-[18px] font-semibold leading-tight text-ink">
            {actualText} <span className="text-[11px] font-medium text-muted">de {targetText}</span>
          </p>
        </div>
        <p className="tnum text-[18px] font-semibold text-ink">{fmtPct(pace.achieved, 1)}</p>
      </div>
      <div className="relative mt-2 h-3 w-full rounded-full" style={{ background: m.track }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pace.achieved * 100)} aria-label={label}>
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct * 100}%`, background: m.fill }} />
        {pace.expected > 0 && pace.expected < 1 && (
          <span className="absolute -top-1 h-5 w-0.5 rounded bg-ink" style={{ left: `calc(${pace.expected * 100}% - 1px)` }} title={`Ritmo esperado: ${fmtPct(pace.expected, 1)} do período decorrido`} aria-hidden />
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
        <span>
          Esperado até hoje: <strong className="tnum font-semibold text-ink-2">{fmtPct(pace.expected, 1)}</strong>
        </span>
        {projectedText && (
          <span>
            Projeção no ritmo atual: <strong className="tnum font-semibold text-ink-2">{projectedText}</strong>
          </span>
        )}
        {perDayText && (
          <span>
            Necessário/dia: <strong className="tnum font-semibold text-ink-2">{perDayText}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

interface GoalCardProps {
  platform: Platform;
  goal: PlatformGoal;
  totals: Totals;
  periodStart: string;
  periodEnd: string;
  today: string;
  campaigns: string[];
  className?: string;
}

export function GoalCard({ platform, goal, totals, periodStart, periodEnd, today, campaigns, className = "" }: GoalCardProps) {
  const totalDays = Math.max(1, diffDays(periodStart, periodEnd) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(0, diffDays(periodStart, today) + 1));
  const completedDays = Math.min(totalDays, Math.max(0, diffDays(periodStart, today)));
  const metricDef = METRICS[goal.metric];
  const actualMetric = metricValue(goal.metric, totals) ?? 0;

  const invPace = pacing(totals.investment, goal.investment, elapsedDays, totalDays, completedDays);
  const kpiPace = pacing(actualMetric, goal.target, elapsedDays, totalDays, completedDays);
  const unit = impliedUnitCost(goal);
  const unitActual = metricValue(unit.key, totals);
  const unitOk = unitActual !== null && unit.value !== null ? unitActual <= unit.value : null;

  const overall: PaceStatus = kpiPace.status;

  return (
    <section className={`fade-in flex h-full min-w-0 flex-col rounded-card border border-line bg-surface p-3.5 shadow-card sm:p-4 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={platform} />
          <h2 className="text-[15px] font-semibold text-ink">{PLATFORM_LABEL[platform]}</h2>
        </div>
        <StatusChip status={overall} />
      </header>
      {campaigns.length > 0 && (
        <p className="mt-1 truncate text-[11px] text-muted" title={campaigns.join(" · ")}>
          {campaigns.join(" · ")}
        </p>
      )}
      <div className="mt-3 flex-1 space-y-4">
        <Meter
          label={`${metricDef.label} (meta principal)`}
          actualText={fmtValue(actualMetric, metricDef.format, { compact: true })}
          targetText={fmtInt(goal.target)}
          pace={kpiPace}
          projectedText={kpiPace.projected !== null ? fmtInt(Math.round(kpiPace.projected)) : null}
          perDayText={kpiPace.perDayNeeded !== null && kpiPace.achieved < 1 ? fmtInt(Math.ceil(kpiPace.perDayNeeded)) : null}
        />
        <Meter
          label="Investimento"
          actualText={fmtCurrency(totals.investment, { compact: true })}
          targetText={fmtCurrency(goal.investment, { compact: true })}
          pace={invPace}
          projectedText={invPace.projected !== null ? fmtCurrency(invPace.projected, { compact: true }) : null}
          perDayText={invPace.perDayNeeded !== null && invPace.achieved < 1 ? fmtCurrency(invPace.perDayNeeded) : null}
        />
        <div className="grid grid-cols-2 gap-2">
          <Stat label={`${unit.label} meta`} value={fmtCurrency(unit.value)} hint="Investimento ÷ meta" />
          <Stat label={`${unit.label} atual`} value={fmtCurrency(unitActual)} tone={unitOk === null ? undefined : unitOk ? "good" : "bad"} hint={unitOk === null ? undefined : unitOk ? "Dentro da meta" : "Acima da meta"} />
          <Stat label="Dias decorridos" value={`${elapsedDays} de ${totalDays}`} hint={elapsedDays > completedDays ? "hoje ainda em andamento" : undefined} />
          <Stat label="Dias restantes" value={fmtInt(Math.max(0, totalDays - elapsedDays))} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-good-text" : tone === "bad" ? "text-crit" : "text-ink";
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <p className="text-[10px] font-medium text-muted">{label}</p>
      <p className={`tnum text-[14px] font-semibold ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
  );
}
