"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";

export interface TableSpec {
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, ReactNode>[];
}

interface ChartCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  controls?: ReactNode;
  /** Visão em tabela (gêmea acessível do gráfico). */
  table?: TableSpec;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Altura máxima da área de conteúdo antes de rolar dentro do card (px ou CSS, ex.: "25vh"). */
  maxBodyHeight?: number | string;
}

/** Teto padrão do corpo: acompanha a viewport, com piso para não achatar em telas baixas. */
const BODY_MAX = "max-h-[25vh] min-h-[150px] sm:max-h-[26vh]";

/** Card de gráfico com alternância Gráfico/Tabela e slot de controles no cabeçalho. */
export function ChartCard({ title, subtitle, controls, table, legend, children, className, maxBodyHeight }: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card
      title={title}
      subtitle={subtitle}
      className={className}
      actions={
        <>
          {controls}
          {table && (
            <Segmented
              label="Visualização"
              value={view}
              onChange={setView}
              options={[
                { key: "chart", label: "Gráfico" },
                { key: "table", label: "Tabela" },
              ]}
            />
          )}
        </>
      }
    >
      {view === "table" && table ? (
        <div className={`scroll-x -mx-1 min-h-0 flex-1 overflow-y-auto ${maxBodyHeight ? "" : BODY_MAX}`} style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}>
          <table className="w-full min-w-[420px] text-[12.5px]">
            <thead className="sticky top-0 z-[1] bg-surface">
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                {table.columns.map((c) => (
                  <th key={c.key} className={`bg-surface px-2 py-1.5 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  {table.columns.map((c) => (
                    <td key={c.key} className={`px-2 py-1.5 ${c.align === "right" ? "tnum text-right" : ""}`}>
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {legend && <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">{legend}</div>}
          <div className={`min-h-0 flex-1 overflow-y-auto ${maxBodyHeight ? "" : BODY_MAX}`} style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}>
            {children}
          </div>
        </div>
      )}
    </Card>
  );
}
