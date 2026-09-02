"use client";

import { useState } from "react";
import { inkOn } from "@/lib/palette";
import { fmtPct, fmtValue, type ValueFormat } from "@/lib/format";
import { SeriesKey } from "@/components/ui/Badge";
import { TooltipBox } from "./ChartTooltip";

export interface ShareSegment {
  key: string;
  label: string;
  color: string;
  value: number;
}

export interface ShareRow {
  label: string;
  format: ValueFormat;
  segments: ShareSegment[];
}

/** Pequenos múltiplos de barras 100% empilhadas: participação por plataforma em cada métrica. */
export function ShareBars({ rows, legend }: { rows: ShareRow[]; legend: { key: string; label: string; color: string }[] }) {
  const [hover, setHover] = useState<{ row: number; seg: number } | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {legend.map((l) => (
          <SeriesKey key={l.key} color={l.color} label={l.label} kind="rect" />
        ))}
      </div>
      <ul className="space-y-3">
        {rows.map((row, ri) => {
          const total = row.segments.reduce((a, s) => a + s.value, 0);
          return (
            <li key={row.label} className="grid grid-cols-[92px_1fr] items-center gap-3 sm:grid-cols-[120px_1fr]">
              <div>
                <p className="text-[12px] font-medium text-ink-2">{row.label}</p>
                <p className="tnum text-[11px] text-muted">{fmtValue(total, row.format, { compact: true })}</p>
              </div>
              <div className="relative">
                <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-md bg-surface-3" role="img" aria-label={`${row.label}: ${row.segments.map((s) => `${s.label} ${fmtPct(total > 0 ? s.value / total : 0, 1)}`).join(", ")}`}>
                  {total > 0 &&
                    row.segments.map((s, si) => {
                      const share = s.value / total;
                      if (share <= 0) return null;
                      return (
                        <div
                          key={s.key}
                          className="relative flex h-full items-center justify-center transition-opacity"
                          style={{ width: `${share * 100}%`, background: s.color, opacity: hover && hover.row === ri && hover.seg !== si ? 0.55 : 1 }}
                          onPointerEnter={() => setHover({ row: ri, seg: si })}
                          onPointerLeave={() => setHover(null)}
                          onFocus={() => setHover({ row: ri, seg: si })}
                          onBlur={() => setHover(null)}
                          tabIndex={0}
                          aria-label={`${s.label}: ${fmtValue(s.value, row.format)} (${fmtPct(share, 1)})`}
                        >
                          {share >= 0.12 && (
                            <span className="text-[11px] font-semibold" style={{ color: inkOn(s.color) }}>
                              {fmtPct(share, 1)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
                {hover && hover.row === ri && (
                  <div className="pointer-events-none absolute left-0 top-7 z-40">
                    <TooltipBox
                      title={row.label}
                      rows={row.segments.map((s) => ({
                        label: s.label,
                        value: `${fmtValue(s.value, row.format)} · ${fmtPct(total > 0 ? s.value / total : 0, 1)}`,
                        color: s.color,
                        kind: "rect",
                      }))}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
