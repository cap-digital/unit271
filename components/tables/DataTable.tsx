"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

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

/** Altura da linha de preenchimento, descontada na medida do conteúdo. */
function fillerHeight(table: HTMLTableElement): number {
  return table.querySelector<HTMLElement>("tr[data-filler]")?.offsetHeight ?? 0;
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

  // A área rolável tem uma altura natural (o menor entre o conteúdo e o limite)
  // e cresce junto quando a grade estica o card, para o total ficar no fim do
  // card em vez de no meio. "O menor entre o conteúdo e o limite" não se escreve
  // só com CSS, por isso o conteúdo é medido.
  //  - sem maxHeight: limite de ~26vh;
  //  - maxHeight="none" (card que preenche a grade): no desktop quem define a
  //    altura é a grade, então a tabela pede só 130px e rola dentro do espaço
  //    que receber; empilhado no mobile, volta ao limite de ~26vh;
  //  - outro maxHeight: altura máxima fixa, sem crescer.
  const sized = maxHeight === undefined || maxHeight === "none";
  const tableRef = useRef<HTMLTableElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = tableRef.current;
    if (!sized || !el) return;
    const ro = new ResizeObserver(() => setContentHeight(el.scrollHeight - fillerHeight(el)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [sized]);

  const scrollClass = sized
    ? `min-h-0 flex-[1_1_0px] [--table-cap:max(130px,25vh)] sm:[--table-cap:max(130px,26vh)] ${maxHeight === "none" ? "lg:[--table-cap:130px]" : ""}`
    : "";
  const scrollStyle = !sized ? { maxHeight } : contentHeight === null ? undefined : { minHeight: `min(${contentHeight}px, var(--table-cap))` };

  return (
    <div className="-mx-3.5 flex min-h-0 flex-1 flex-col sm:-mx-4">
      <div className={`scroll-x overflow-y-auto ${scrollClass}`} style={scrollStyle}>
        <table ref={tableRef} className="h-full w-full min-w-[560px] border-separate border-spacing-0 text-[12.5px]">
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
            {/* absorve a sobra de altura quando o card é maior que as linhas, para o total ficar no fim */}
            {visible.length > 0 && (
              <tr aria-hidden data-filler className="h-full">
                <td colSpan={columns.length} className="p-0" />
              </tr>
            )}
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
