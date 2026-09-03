import { relChange } from "./format";
import { aggregate, dailySeries, METRICS, metricValue, type MetricDef, type MetricKey, type Totals } from "./metrics";
import { PLATFORM_COLOR, TOTAL_COLOR } from "./palette";
import { PLATFORM_LABEL, PLATFORMS, type Platform, type Row } from "./types";

export interface KpiResult {
  def: MetricDef;
  value: number | null;
  delta: number | null;
  spark: (number | null)[];
}

/** KPIs com delta vs período anterior e sparkline diária. */
export function buildKpis(rows: Row[], prevRows: Row[], days: string[], keys: MetricKey[], withDelta: boolean): KpiResult[] {
  const t = aggregate(rows);
  const p = aggregate(prevRows);
  return keys.map((key) => {
    const def = METRICS[key];
    const value = metricValue(key, t);
    const prev = prevRows.length > 0 ? metricValue(key, p) : null;
    const delta = withDelta ? relChange(value, prev) : null;
    const spark = days.length >= 2 ? dailySeries(rows, days, key).map((d) => d.value) : [];
    return { def, value, delta, spark };
  });
}

export interface SeriesPoint {
  date: string;
  [k: string]: number | null | string;
}

export function totalSeries(rows: Row[], days: string[], key: MetricKey): SeriesPoint[] {
  return dailySeries(rows, days, key).map((d) => ({ date: d.date, total: d.value }));
}

export function platformSeries(rows: Row[], days: string[], key: MetricKey, platforms: Platform[] = PLATFORMS): SeriesPoint[] {
  const per = platforms.map((p) => ({ p, s: dailySeries(rows.filter((r) => r.platform === p), days, key) }));
  return days.map((date, i) => {
    const point: SeriesPoint = { date };
    for (const { p, s } of per) point[p] = s[i].value;
    return point;
  });
}

export const TOTAL_SERIES = [{ key: "total", label: "Total", color: TOTAL_COLOR }];

export function platformSeriesDefs(platforms: Platform[] = PLATFORMS) {
  return platforms.map((p) => ({ key: p, label: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p] }));
}

export interface Stage {
  label: string;
  value: number;
  hint?: string;
  /** Base alternativa para o "% do topo" (quando a etapa só existe em parte das plataformas). */
  base?: { value: number; label: string };
  /** Omite a conversão sobre a etapa anterior quando ela não faz sentido. */
  noStep?: boolean;
}

/**
 * Estágios do funil (ordem monotônica garantida pelos dados de origem).
 * O Google não tem funil: cliques e engajamentos são interações de naturezas
 * diferentes, então a página mostra a tabela de anúncios no lugar.
 */
export function funnelStages(t: Totals, platform: "youtube" | "tiktok" | "all"): Stage[] {
  switch (platform) {
    case "youtube":
      return [
        { label: "Assistiu 25%", value: t.p25, hint: "Impressões que chegaram a 25% do vídeo" },
        { label: "Assistiu 50%", value: t.p50 },
        { label: "Assistiu 75%", value: t.p75 },
        { label: "Assistiu 100%", value: t.p100 },
      ];
    case "tiktok":
      return [
        { label: "Views 2 s", value: t.views, hint: "Visualizações de 2 segundos" },
        { label: "Assistiu 25%", value: t.p25 },
        { label: "Assistiu 50%", value: t.p50 },
        { label: "Assistiu 75%", value: t.p75 },
        { label: "Assistiu 100%", value: t.p100 },
      ];
    default:
      return [
        { label: "Impressões", value: t.impressions, hint: "Todas as plataformas" },
        {
          label: "Visualizações",
          value: t.views,
          hint: "YouTube (TrueView) + TikTok (2 s) · % sobre impressões de vídeo",
          base: { value: t.scope.views.impressions, label: "impressões de vídeo" },
        },
        { label: "Cliques", value: t.clicks, hint: "Todas as plataformas · % sobre todas as impressões", noStep: true },
      ];
  }
}

/** Retenção sobre impressões das plataformas que reportam quartis: [1, p25, p50, p75, p100] / impressões. */
export function retentionPoints(t: Totals): (number | null)[] {
  const base = t.scope.quartiles.impressions;
  if (!t.hasQuartiles || base <= 0) return [null, null, null, null, null];
  return [1, t.p25 / base, t.p50 / base, t.p75 / base, t.p100 / base];
}

export const AGE_ORDER = ["AGE_13_17", "AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45_54", "AGE_55_100", "AGE_55_PLUS"];

export function ageSort(a: string, b: string): number {
  const ia = AGE_ORDER.indexOf(a);
  const ib = AGE_ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
}

export const GENDER_ORDER = ["FEMALE", "MALE", "NONE", "UNKNOWN"];

export function genderSort(a: string, b: string): number {
  const ia = GENDER_ORDER.indexOf(a);
  const ib = GENDER_ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
}
