"use client";

import type { KpiResult } from "@/lib/derive";
import { fmtValue } from "@/lib/format";
import type { MetricKey } from "@/lib/metrics";
import { KpiCard } from "@/components/ui/KpiCard";

interface KpiGridProps {
  kpis: KpiResult[];
  hints?: Partial<Record<MetricKey, string>>;
  className?: string;
}

/** Quatro indicadores por linha no desktop; empilhados no mobile. */
export function KpiGrid({ kpis, hints, className = "" }: KpiGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}>
      {kpis.map((k) => (
        <KpiCard
          key={k.def.key}
          label={k.def.label}
          value={fmtValue(k.value, k.def.format, { compact: k.def.kind === "sum" })}
          delta={k.delta}
          higherIsBetter={k.def.higherIsBetter}
          spark={k.spark}
          hint={hints?.[k.def.key]}
          description={k.def.description}
        />
      ))}
    </div>
  );
}
