/** Formatação pt-BR centralizada. */

const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const dec1Fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dec2Fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl3 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 3, maximumFractionDigits: 3 });
const brl0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export type ValueFormat = "currency" | "int" | "pct" | "decimal";

export function fmtInt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return intFmt.format(v);
}

export function fmtDecimal(v: number | null | undefined, digits: 1 | 2 = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return digits === 1 ? dec1Fmt.format(v) : dec2Fmt.format(v);
}

/** Moeda: valores pequenos (< R$ 0,10) ganham 3 casas para não virarem "R$ 0,00". */
export function fmtCurrency(v: number | null | undefined, opts?: { compact?: boolean }): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (opts?.compact) {
    if (Math.abs(v) >= 1_000_000) return `R$ ${dec1Fmt.format(v / 1_000_000)} mi`;
    if (Math.abs(v) >= 10_000) return `R$ ${dec1Fmt.format(v / 1_000)} mil`;
    return v >= 100 ? brl0.format(v) : brl2.format(v);
  }
  if (v !== 0 && Math.abs(v) < 0.1) return brl3.format(v);
  return brl2.format(v);
}

export function fmtPct(v: number | null | undefined, digits: 1 | 2 = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const pct = v * 100;
  const d = Math.abs(pct) < 1 ? 2 : digits;
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(pct)}%`;
}

/** Inteiros compactos para tiles: 1.234 · 43,2 mil · 1,2 mi. */
export function fmtCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${dec1Fmt.format(v / 1_000_000)} mi`;
  if (a >= 10_000) return `${dec1Fmt.format(v / 1_000)} mil`;
  return intFmt.format(v);
}

export function fmtValue(v: number | null | undefined, format: ValueFormat, opts?: { compact?: boolean }): string {
  switch (format) {
    case "currency":
      return fmtCurrency(v, opts);
    case "pct":
      return fmtPct(v);
    case "decimal":
      return fmtDecimal(v);
    default:
      return opts?.compact ? fmtCompact(v) : fmtInt(v);
  }
}

/**
 * Formatador de eixo consistente para toda a escala: decide a precisão pelo maior
 * valor plotado, para que todos os ticks tenham o mesmo número de casas.
 */
export function makeAxisFormatter(format: ValueFormat, maxAbs: number): (v: number) => string {
  const m = Number.isFinite(maxAbs) && maxAbs > 0 ? maxAbs : 1;
  if (format === "pct") {
    const digits = m * 100 < 2 ? 2 : m * 100 < 10 ? 1 : 0;
    const f = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return (v) => `${f.format(v * 100)}%`;
  }
  if (format === "currency") {
    if (m >= 10_000) return (v) => `R$${dec1Fmt.format(v / 1000).replace(",0", "")}k`;
    if (m >= 100) return (v) => `R$${intFmt.format(v)}`;
    const digits = m < 1 ? 3 : m < 10 ? 2 : 1;
    const f = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return (v) => `R$${f.format(v)}`;
  }
  if (m >= 1_000_000) return (v) => `${dec1Fmt.format(v / 1_000_000).replace(",0", "")}M`;
  if (m >= 10_000) return (v) => `${dec1Fmt.format(v / 1000).replace(",0", "")}k`;
  if (format === "decimal" || m < 10) return (v) => (Number.isInteger(v) ? intFmt.format(v) : dec1Fmt.format(v));
  return (v) => intFmt.format(v);
}

/** Rótulo curto de eixo. */
export function fmtAxis(v: number, format: ValueFormat): string {
  if (!Number.isFinite(v)) return "";
  if (format === "pct") return `${dec1Fmt.format(v * 100).replace(",0", "")}%`;
  if (format === "currency") {
    if (Math.abs(v) >= 1000) return `R$${intFmt.format(v / 1000)}k`;
    if (Math.abs(v) < 1 && v !== 0) return `R$${dec2Fmt.format(v)}`;
    return `R$${intFmt.format(v)}`;
  }
  if (Math.abs(v) >= 1_000_000) return `${dec1Fmt.format(v / 1_000_000).replace(",0", "")}M`;
  if (Math.abs(v) >= 1000) return `${dec1Fmt.format(v / 1000).replace(",0", "")}k`;
  return format === "decimal" ? dec1Fmt.format(v) : intFmt.format(v);
}

/** Variação relativa entre dois valores (null quando não é calculável). */
export function relChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function fmtSignedPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  const s = v > 0 ? "+" : "";
  return `${s}${dec1Fmt.format(v * 100)}%`;
}
