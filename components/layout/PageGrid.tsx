import type { ReactNode } from "react";

/**
 * Grade de 12 colunas a partir de `lg`. No mobile tudo empilha em uma coluna,
 * como pedido; no desktop os cards recebem col-span variados e mesma altura.
 */
export function PageGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 items-stretch gap-3 lg:grid-cols-12 ${className}`}>{children}</div>;
}
