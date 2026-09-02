import type { ReactNode } from "react";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  kind?: "line" | "rect";
}

/** Tooltip único para todos os gráficos: valor em destaque, rótulo secundário, chave de linha na cor da série. */
export function TooltipBox({ title, rows, footer }: { title: ReactNode; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-[150px] rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-float">
      <p className="mb-1 font-medium text-muted">{title}</p>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-ink-2">
              {r.color &&
                (r.kind === "rect" ? (
                  <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: r.color }} aria-hidden />
                ) : (
                  <span className="inline-block h-[3px] w-3.5 rounded-full" style={{ background: r.color }} aria-hidden />
                ))}
              {r.label}
            </span>
            <span className="tnum font-semibold text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-line pt-1.5 text-[11px] text-muted">{footer}</p>}
    </div>
  );
}
