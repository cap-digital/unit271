"use client";

import { RefreshCw } from "lucide-react";
import { fmtTime } from "@/lib/dates";
import { useDashboard } from "@/store/DashboardContext";
import { Badge } from "@/components/ui/Badge";
import { DateRangePicker } from "./DateRangePicker";

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** A página de Metas usa o período das metas, não o filtro do topo. */
  showRange?: boolean;
}

export function Header({ title, subtitle, showRange = true }: HeaderProps) {
  const { status, dataset, refresh, medx } = useDashboard();
  const refreshing = status === "refreshing" || status === "loading";
  return (
    <header className="sticky top-2 z-30 rounded-card border border-line bg-surface/90 px-3.5 py-2.5 shadow-card backdrop-blur sm:px-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy sm:flex md:hidden">
            <span className="text-[15px] font-black tracking-tight text-white">
              Un<span className="text-gold">i</span>t
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[16px] font-semibold leading-tight text-ink">{title}</h1>
              {medx ? <Badge variant="gold">MEDX</Badge> : <Badge variant="navy">Campanha 27.1</Badge>}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted">{subtitle ?? "Universidade Tiradentes · Medicina 2027.1 · Mídia paga (Google, YouTube e TikTok)"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showRange && <DateRangePicker />}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-[12px] font-medium text-ink-2 hover:bg-surface-3 disabled:cursor-wait"
            title="Buscar dados atualizados na base"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-navy" : ""}`} aria-hidden />
            {refreshing ? "Atualizando…" : `Atualizado ${fmtTime(dataset?.fetchedAt ?? null)}`}
          </button>
        </div>
      </div>
    </header>
  );
}
