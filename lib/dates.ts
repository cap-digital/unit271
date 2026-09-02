import { TIMEZONE } from "./config";

/** Data de hoje (YYYY-MM-DD) no fuso das campanhas. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Soma dias a uma data ISO sem depender do fuso local. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d + n);
  return new Date(t).toISOString().slice(0, 10);
}

/** Diferença em dias (b − a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Lista inclusiva de dias entre duas datas ISO. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start || !end || start > end) return out;
  let cur = start;
  // proteção contra intervalos absurdos
  for (let i = 0; i < 3660 && cur <= end; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function isValidISO(iso: string | null | undefined): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(`${iso}T00:00:00Z`));
}

/** dd/mm */
export function fmtDay(iso: string): string {
  if (!isValidISO(iso)) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** dd/mm/aaaa */
export function fmtDateBR(iso: string): string {
  if (!isValidISO(iso)) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** "seg., 31/08" */
export function fmtDayLong(iso: string): string {
  if (!isValidISO(iso)) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  return `${wd} ${fmtDay(iso)}`;
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* ------------------------------------------------------------------ */
/* Intervalos e presets                                                */
/* ------------------------------------------------------------------ */

export type RangePreset = "today" | "yesterday" | "last7" | "last30" | "all" | "custom";

export interface DateRange {
  preset: RangePreset;
  /** Usados apenas quando preset === "custom". */
  start: string | null;
  end: string | null;
}

export interface ResolvedRange {
  start: string;
  end: string;
}

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "last7", label: "Últimos 7 dias" },
  { key: "last30", label: "Últimos 30 dias" },
  { key: "all", label: "Todo o período" },
];

export const DEFAULT_RANGE: DateRange = { preset: "all", start: null, end: null };

/**
 * Converte o preset em datas concretas. "Todo o período" usa os limites dos
 * dados; quando ainda não há dados, cai em um intervalo amplo.
 */
export function resolveRange(range: DateRange, dataMin: string | null, dataMax: string | null, today = todayISO()): ResolvedRange {
  switch (range.preset) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { start: y, end: y };
    }
    case "last7":
      return { start: addDays(today, -6), end: today };
    case "last30":
      return { start: addDays(today, -29), end: today };
    case "custom": {
      const s = isValidISO(range.start) ? range.start : dataMin ?? today;
      const e = isValidISO(range.end) ? range.end : dataMax ?? today;
      return s <= e ? { start: s, end: e } : { start: e, end: s };
    }
    default:
      // sem dados ainda: intervalo vazio (evita gravar a data de build no HTML pré-renderizado)
      return { start: dataMin ?? "", end: dataMax ?? "" };
  }
}

/** Intervalo imediatamente anterior, com a mesma duração (para deltas). */
export function previousRange(r: ResolvedRange): ResolvedRange {
  if (!isValidISO(r.start) || !isValidISO(r.end)) return { start: "", end: "" };
  const len = diffDays(r.start, r.end) + 1;
  return { start: addDays(r.start, -len), end: addDays(r.start, -1) };
}

export function rangeLabel(range: DateRange, resolved: ResolvedRange): string {
  const preset = RANGE_PRESETS.find((p) => p.key === range.preset)?.label ?? "Personalizado";
  if (!isValidISO(resolved.start) || !isValidISO(resolved.end)) return preset;
  const span = resolved.start === resolved.end ? fmtDay(resolved.start) : `${fmtDay(resolved.start)} – ${fmtDay(resolved.end)}`;
  return `${preset} · ${span}`;
}
