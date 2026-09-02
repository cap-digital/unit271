"use client";

import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RANGE_PRESETS, rangeLabel, type DateRange } from "@/lib/dates";
import { useDashboard } from "@/store/DashboardContext";

/** Seletor de período: presets em linhas (check de 16px na seleção) + intervalo personalizado no rodapé. */
export function DateRangePicker() {
  const { range, setRange, resolved, dataMin, dataMax } = useDashboard();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(resolved.start);
  const [end, setEnd] = useState(resolved.end);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStart(resolved.start);
    setEnd(resolved.end);
  }, [resolved.start, resolved.end]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (r: DateRange) => {
    setRange(r);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!start || !end) return;
    choose({ preset: "custom", start: start <= end ? start : end, end: start <= end ? end : start });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-line bg-surface-2 pl-3 pr-2.5 text-[13px] font-medium text-ink hover:bg-surface-3"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-navy" aria-hidden />
        <span className="truncate">{rangeLabel(range, resolved)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div role="dialog" aria-label="Período" className="fade-in absolute left-0 z-50 mt-2 w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-2 shadow-float sm:left-auto sm:right-0">
          <ul className="space-y-0.5">
            {RANGE_PRESETS.map((p) => {
              const selected = range.preset === p.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => choose({ preset: p.key, start: null, end: null })}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] hover:bg-surface-2 ${selected ? "font-semibold text-navy" : "text-ink"}`}
                  >
                    {p.label}
                    {selected && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-line pt-2">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Personalizado</p>
            <div className="flex items-center gap-2 px-3">
              <label className="flex-1 text-[11px] text-muted">
                De
                <input type="date" value={start} min={dataMin ?? undefined} max={dataMax ?? undefined} onChange={(e) => setStart(e.target.value)} className="mt-0.5 block h-8 w-full rounded-lg border border-line bg-surface-2 px-2 text-[12px] text-ink" />
              </label>
              <label className="flex-1 text-[11px] text-muted">
                Até
                <input type="date" value={end} min={dataMin ?? undefined} max={dataMax ?? undefined} onChange={(e) => setEnd(e.target.value)} className="mt-0.5 block h-8 w-full rounded-lg border border-line bg-surface-2 px-2 text-[12px] text-ink" />
              </label>
            </div>
            <div className="mt-2 flex items-center justify-between px-3 pb-1">
              {dataMin && dataMax && (
                <span className="text-[11px] text-muted">
                  Dados: {dataMin.slice(8, 10)}/{dataMin.slice(5, 7)} – {dataMax.slice(8, 10)}/{dataMax.slice(5, 7)}
                </span>
              )}
              <button type="button" onClick={applyCustom} className="ml-auto h-8 rounded-full bg-navy px-3 text-[12px] font-semibold text-white hover:bg-navy-2">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
