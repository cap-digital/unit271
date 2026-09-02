"use client";

import { fmtInt, fmtPct } from "@/lib/format";
import { ORDINAL_RAMP, ordinalSteps } from "@/lib/palette";

export interface FunnelStage {
  label: string;
  value: number;
  hint?: string;
  /** Base alternativa para o "% do topo" (etapa que só existe em parte das plataformas). */
  base?: { value: number; label: string };
  /** Omite a conversão sobre a etapa anterior. */
  noStep?: boolean;
}

/**
 * Funil como barras ordenadas: largura relativa ao primeiro estágio (mínimo visível),
 * com % do topo e conversão etapa a etapa — os números carregam o que a largura não mostra.
 */
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const first = stages[0]?.value ?? 0;
  const colors = stages.length <= ORDINAL_RAMP.length ? ordinalSteps(stages.length) : stages.map(() => ORDINAL_RAMP[2]);
  return (
    <ol className="space-y-2">
      {stages.map((s, i) => {
        const baseValue = s.base ? s.base.value : first;
        const ofTop = baseValue > 0 ? s.value / baseValue : 0;
        const prev = i > 0 ? stages[i - 1] : null;
        const step = !s.noStep && prev && !prev.base && prev.value > 0 ? s.value / prev.value : null;
        const width = first > 0 ? Math.max((s.value / first) * 100, s.value > 0 ? 1.5 : 0) : 0;
        const pctTitle = s.base ? `% sobre ${s.base.label} (${fmtInt(s.base.value)})` : "% sobre o topo do funil";
        return (
          <li key={s.label} className="grid grid-cols-[96px_1fr] items-center gap-3 sm:grid-cols-[140px_1fr_170px]">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-ink-2" title={s.hint}>
                {s.label}
              </p>
              <p className="tnum text-[11px] text-muted sm:hidden">
                {fmtInt(s.value)} · {fmtPct(ofTop, 1)}
                {s.base ? "*" : ""}
              </p>
            </div>
            <div className="h-6 w-full rounded-md bg-surface-3" title={`${s.label}: ${fmtInt(s.value)}`}>
              <div className="h-full rounded-md transition-[width]" style={{ width: `${width}%`, background: colors[i] }} />
            </div>
            <div className="hidden items-center justify-end gap-2 text-right sm:flex">
              <span className="tnum text-[13px] font-semibold text-ink">{fmtInt(s.value)}</span>
              <span className="tnum w-16 text-[11px] text-muted" title={pctTitle}>
                {fmtPct(ofTop, 1)}
                {s.base ? "*" : ""}
              </span>
              <span className={`tnum min-w-[74px] whitespace-nowrap rounded-full px-1.5 py-0.5 text-center text-[11px] font-medium ${step === null ? "text-transparent" : "bg-surface-3 text-ink-2"}`} title="Conversão sobre a etapa anterior">
                {step === null ? "—" : `→ ${fmtPct(step, 1)}`}
              </span>
            </div>
          </li>
        );
      })}
      {stages.some((s) => s.base) && (
        <li className="pt-1 text-[11px] text-muted">
          * {stages.filter((s) => s.base).map((s) => `${s.label}: % sobre ${s.base!.label} (${fmtInt(s.base!.value)})`).join(" · ")}
        </li>
      )}
    </ol>
  );
}
