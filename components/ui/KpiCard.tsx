"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { fmtSignedPct } from "@/lib/format";
import { Sparkline } from "@/components/charts/Sparkline";

interface KpiCardProps {
  label: string;
  value: string;
  /** Texto auxiliar (ex.: "TrueView + 2 s"). */
  hint?: string;
  /** Variação relativa vs período anterior; null oculta. */
  delta?: number | null;
  deltaLabel?: string;
  higherIsBetter?: boolean;
  spark?: (number | null)[];
  /** Descrição da métrica (tooltip nativo). */
  description?: string;
}

export function KpiCard({ label, value, hint, delta, deltaLabel = "vs período anterior", higherIsBetter = true, spark, description }: KpiCardProps) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const positive = hasDelta && (delta as number) > 0.0005;
  const negative = hasDelta && (delta as number) < -0.0005;
  const good = (positive && higherIsBetter) || (negative && !higherIsBetter);
  const bad = (positive && !higherIsBetter) || (negative && higherIsBetter);
  const tone = good ? "text-good-text bg-[#eaf6ea]" : bad ? "text-crit bg-[#fdeaea]" : "text-ink-2 bg-surface-3";
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <div className="fade-in flex min-h-[94px] flex-col justify-between rounded-card border border-line bg-surface px-3.5 py-3 shadow-card" title={description}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-muted">{label}</p>
        {spark && spark.some((v) => v !== null) && <Sparkline values={spark} width={58} height={20} />}
      </div>
      <div>
        <p className="text-[24px] font-semibold leading-none tracking-tight text-ink">{value}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {hasDelta ? (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
              <Icon className="h-3 w-3" aria-hidden />
              {fmtSignedPct(delta as number)}
              <span className="sr-only"> {deltaLabel}</span>
            </span>
          ) : null}
          {hint && <span className="text-[10.5px] leading-tight text-muted">{hint}</span>}
        </div>
      </div>
    </div>
  );
}
