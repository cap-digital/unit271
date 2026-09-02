"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Valor usado na ordenação; sem ele a coluna não ordena. */
  sortValue?: (row: T) => number | string | null;
  render: (row: T) => ReactNode;
  className?: string;
  /** Largura mínima em px (mobile faz scroll horizontal). */
  minWidth?: number;
  description?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  /** Linha de totais (renderizada no rodapé). */
  footer?: Record<string, ReactNode>;
  emptyText?: string;
  dense?: boolean;
  maxRows?: number;
  /** Altura máxima da área rolável (px ou CSS, ex.: "24vh"); cabeçalho e rodapé ficam fixos. */
  maxHeight?: number | string;
}

/** Compara ignorando nulos; a ordenação os empurra sempre para o fim. */
function cmp(a: number | string | null, b: number | string | null): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

function isEmpty(v: number | string | null | undefined): boolean {
  return v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
}

/** Tabela ordenável por clique no cabeçalho, com scroll horizontal e vertical dentro do card. */
export function DataTable<T>({ columns, rows, rowKey, initialSort, footer, emptyText = "Sem dados para o período.", dense = false, maxRows, maxHeight }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = sv(a);
      const vb = sv(b);
      // valores ausentes ficam no fim nas duas direções
      if (isEmpty(va) || isEmpty(vb)) return isEmpty(va) && isEmpty(vb) ? 0 : isEmpty(va) ? 1 : -1;
      const r = cmp(va, vb);
      return sort.dir === "asc" ? r : -r;
    });
    return copy;
  }, [rows, sort, columns]);

  const visible = maxRows ? sorted.slice(0, maxRows) : sorted;

  const toggle = (col: Column<T>) => {
    if (!col.sortValue) return;
    setSort((s) => {
      if (!s || s.key !== col.key) {
        // números começam do maior; textos do menor (procura o primeiro valor não nulo)
        const sample = rows.map((r) => col.sortValue!(r)).find((v) => !isEmpty(v)) ?? null;
        return { key: col.key, dir: typeof sample === "number" ? "desc" : "asc" };
      }
      return { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" };
    });
  };

  const py = dense ? "py-1.5" : "py-2";

  return (
    <div className="-mx-3.5 min-h-0 flex-1 sm:-mx-4">
      <div className={`scroll-x overflow-y-auto ${maxHeight ? "" : "max-h-[25vh] min-h-[130px] sm:max-h-[26vh]"}`} style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr>
              {columns.map((c, i) => {
                const active = sort?.key === c.key;
                const Icon = active ? (sort!.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={{ minWidth: c.minWidth }}
                    className={`sticky top-0 z-[2] whitespace-nowrap border-b border-line bg-surface-2 px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted ${c.align === "right" ? "text-right" : "text-left"} ${i === 0 ? "pl-3.5 sm:pl-4" : ""} ${i === columns.length - 1 ? "pr-3.5 sm:pr-4" : ""}`}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggle(c)} title={c.description} className={`inline-flex items-center gap-1 rounded hover:text-ink ${active ? "text-navy" : ""} ${c.align === "right" ? "flex-row-reverse" : ""}`}>
                        {c.label}
                        <Icon className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} aria-hidden />
                      </button>
                    ) : (
                      <span title={c.description}>{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-muted">
                  {emptyText}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={rowKey(r)} className="group hover:bg-surface-2">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={`border-b border-line/70 px-2.5 ${py} align-middle ${c.align === "right" ? "tnum text-right" : "text-left"} ${i === 0 ? "pl-3.5 sm:pl-4" : ""} ${i === columns.length - 1 ? "pr-3.5 sm:pr-4" : ""} ${c.className ?? ""}`}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && visible.length > 0 && (
            <tfoot>
              <tr>
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={`sticky bottom-0 z-[2] border-t border-line bg-surface-2 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink ${c.align === "right" ? "tnum text-right" : "text-left"} ${i === 0 ? "pl-3.5 sm:pl-4" : ""} ${i === columns.length - 1 ? "pr-3.5 sm:pr-4" : ""}`}
                  >
                    {footer[c.key] ?? ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {maxRows && sorted.length > maxRows && <p className="px-3.5 pt-1.5 text-[11px] text-muted sm:px-4">Mostrando {maxRows} de {sorted.length} linhas.</p>}
    </div>
  );
}
