import type { ValueFormat } from "./format";
import type { Platform, Row } from "./types";

/* ------------------------------------------------------------------ */
/* Totais                                                              */
/* ------------------------------------------------------------------ */

export interface Totals {
  investment: number;
  impressions: number;
  clicks: number;
  engagements: number;
  views: number;
  views6s: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  rows: number;
  days: number;
  /** Disponibilidade: true quando ao menos uma linha reporta a métrica. */
  hasEngagements: boolean;
  hasViews: boolean;
  hasViews6s: boolean;
  hasQuartiles: boolean;
  /**
   * Bases restritas às linhas que reportam cada métrica, para que taxas e custos
   * de vídeo (VTR, CPV) ou de engajamento (CPE) não usem impressões/investimento
   * de plataformas que não os medem quando várias plataformas são somadas.
   */
  scope: {
    views: { investment: number; impressions: number };
    views6s: { investment: number; impressions: number };
    engagements: { investment: number; impressions: number };
    quartiles: { impressions: number };
  };
}

export const EMPTY_TOTALS: Totals = {
  investment: 0,
  impressions: 0,
  clicks: 0,
  engagements: 0,
  views: 0,
  views6s: 0,
  p25: 0,
  p50: 0,
  p75: 0,
  p100: 0,
  rows: 0,
  days: 0,
  hasEngagements: false,
  hasViews: false,
  hasViews6s: false,
  hasQuartiles: false,
  scope: {
    views: { investment: 0, impressions: 0 },
    views6s: { investment: 0, impressions: 0 },
    engagements: { investment: 0, impressions: 0 },
    quartiles: { impressions: 0 },
  },
};

/** Soma linhas; razões nunca são somadas — derivam dos totais. */
export function aggregate(rows: Row[]): Totals {
  const t: Totals = {
    ...EMPTY_TOTALS,
    scope: {
      views: { investment: 0, impressions: 0 },
      views6s: { investment: 0, impressions: 0 },
      engagements: { investment: 0, impressions: 0 },
      quartiles: { impressions: 0 },
    },
  };
  const days = new Set<string>();
  for (const r of rows) {
    t.investment += r.investment;
    t.impressions += r.impressions;
    t.clicks += r.clicks;
    if (r.engagements !== null) {
      t.engagements += r.engagements;
      t.hasEngagements = true;
      t.scope.engagements.investment += r.investment;
      t.scope.engagements.impressions += r.impressions;
    }
    if (r.views !== null) {
      t.views += r.views;
      t.hasViews = true;
      t.scope.views.investment += r.investment;
      t.scope.views.impressions += r.impressions;
    }
    if (r.views6s !== null) {
      t.views6s += r.views6s;
      t.hasViews6s = true;
      t.scope.views6s.investment += r.investment;
      t.scope.views6s.impressions += r.impressions;
    }
    if (r.p25 !== null) {
      t.p25 += r.p25;
      t.p50 += r.p50 ?? 0;
      t.p75 += r.p75 ?? 0;
      t.p100 += r.p100 ?? 0;
      t.hasQuartiles = true;
      t.scope.quartiles.impressions += r.impressions;
    }
    t.rows++;
    days.add(r.date);
  }
  t.days = days.size;
  return t;
}

function ratio(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

/* ------------------------------------------------------------------ */
/* Registro de métricas                                                */
/* ------------------------------------------------------------------ */

export type MetricKey =
  | "investment"
  | "impressions"
  | "clicks"
  | "engagements"
  | "views"
  | "views6s"
  | "p25"
  | "p50"
  | "p75"
  | "p100"
  | "cpm"
  | "cpc"
  | "ctr"
  | "cpv"
  | "cpe"
  | "vtr"
  | "vtr6s"
  | "completion"
  | "engRate";

export interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  description: string;
  format: ValueFormat;
  /** "sum" acumula; "ratio" deriva dos totais. */
  kind: "sum" | "ratio";
  /** Plataformas que reportam a métrica. */
  platforms: Platform[];
  /** Para deltas: subir é bom? (custos: não). */
  higherIsBetter: boolean;
  compute: (t: Totals) => number | null;
}

const ALL: Platform[] = ["google", "youtube", "tiktok"];
const VIDEO: Platform[] = ["youtube", "tiktok"];

export const METRICS: Record<MetricKey, MetricDef> = {
  investment: {
    key: "investment",
    label: "Investimento",
    short: "Invest.",
    description: "Valor investido (base única de custo do dashboard).",
    format: "currency",
    kind: "sum",
    platforms: ALL,
    higherIsBetter: true,
    compute: (t) => t.investment,
  },
  impressions: {
    key: "impressions",
    label: "Impressões",
    short: "Impr.",
    description: "Vezes em que o anúncio foi exibido.",
    format: "int",
    kind: "sum",
    platforms: ALL,
    higherIsBetter: true,
    compute: (t) => t.impressions,
  },
  clicks: {
    key: "clicks",
    label: "Cliques",
    short: "Cliques",
    description: "Cliques no anúncio.",
    format: "int",
    kind: "sum",
    platforms: ALL,
    higherIsBetter: true,
    compute: (t) => t.clicks,
  },
  engagements: {
    key: "engagements",
    label: "Engajamentos",
    short: "Engaj.",
    description: "Interações reportadas pelo Google Ads (Google e YouTube).",
    format: "int",
    kind: "sum",
    platforms: ["google", "youtube"],
    higherIsBetter: true,
    compute: (t) => (t.hasEngagements ? t.engagements : null),
  },
  views: {
    key: "views",
    label: "Visualizações",
    short: "Views",
    description: "YouTube: TrueView views · TikTok: visualizações de 2 s.",
    format: "int",
    kind: "sum",
    platforms: VIDEO,
    higherIsBetter: true,
    compute: (t) => (t.hasViews ? t.views : null),
  },
  views6s: {
    key: "views6s",
    label: "Views 6 s",
    short: "Views 6s",
    description: "Visualizações de 6 segundos (TikTok).",
    format: "int",
    kind: "sum",
    platforms: ["tiktok"],
    higherIsBetter: true,
    compute: (t) => (t.hasViews6s ? t.views6s : null),
  },
  p25: {
    key: "p25",
    label: "Views até 25%",
    short: "25%",
    description: "Impressões que assistiram até 25% do vídeo.",
    format: "int",
    kind: "sum",
    platforms: VIDEO,
    higherIsBetter: true,
    compute: (t) => (t.hasQuartiles ? t.p25 : null),
  },
  p50: {
    key: "p50",
    label: "Views até 50%",
    short: "50%",
    description: "Impressões que assistiram até 50% do vídeo.",
    format: "int",
    kind: "sum",
    platforms: VIDEO,
    higherIsBetter: true,
    compute: (t) => (t.hasQuartiles ? t.p50 : null),
  },
  p75: {
    key: "p75",
    label: "Views até 75%",
    short: "75%",
    description: "Impressões que assistiram até 75% do vídeo.",
    format: "int",
    kind: "sum",
    platforms: VIDEO,
    higherIsBetter: true,
    compute: (t) => (t.hasQuartiles ? t.p75 : null),
  },
  p100: {
    key: "p100",
    label: "Views completas",
    short: "100%",
    description: "Impressões que assistiram o vídeo até o fim.",
    format: "int",
    kind: "sum",
    platforms: VIDEO,
    higherIsBetter: true,
    compute: (t) => (t.hasQuartiles ? t.p100 : null),
  },
  cpm: {
    key: "cpm",
    label: "CPM",
    short: "CPM",
    description: "Custo por mil impressões = Investimento ÷ Impressões × 1.000.",
    format: "currency",
    kind: "ratio",
    platforms: ALL,
    higherIsBetter: false,
    compute: (t) => {
      const r = ratio(t.investment, t.impressions);
      return r === null ? null : r * 1000;
    },
  },
  cpc: {
    key: "cpc",
    label: "CPC",
    short: "CPC",
    description: "Custo por clique = Investimento ÷ Cliques.",
    format: "currency",
    kind: "ratio",
    platforms: ALL,
    higherIsBetter: false,
    compute: (t) => ratio(t.investment, t.clicks),
  },
  ctr: {
    key: "ctr",
    label: "CTR",
    short: "CTR",
    description: "Taxa de cliques = Cliques ÷ Impressões.",
    format: "pct",
    kind: "ratio",
    platforms: ALL,
    higherIsBetter: true,
    compute: (t) => ratio(t.clicks, t.impressions),
  },
  cpv: {
    key: "cpv",
    label: "CPV",
    short: "CPV",
    description: "Custo por visualização = Investimento (vídeo) ÷ Visualizações.",
    format: "currency",
    kind: "ratio",
    platforms: VIDEO,
    higherIsBetter: false,
    compute: (t) => (t.hasViews ? ratio(t.scope.views.investment, t.views) : null),
  },
  cpe: {
    key: "cpe",
    label: "CPE",
    short: "CPE",
    description: "Custo por engajamento = Investimento (Google/YouTube) ÷ Engajamentos.",
    format: "currency",
    kind: "ratio",
    platforms: ["google", "youtube"],
    higherIsBetter: false,
    compute: (t) => (t.hasEngagements ? ratio(t.scope.engagements.investment, t.engagements) : null),
  },
  vtr: {
    key: "vtr",
    label: "VTR",
    short: "VTR",
    description: "View-through rate = Visualizações ÷ Impressões (somente plataformas de vídeo).",
    format: "pct",
    kind: "ratio",
    platforms: VIDEO,
    higherIsBetter: true,
    compute: (t) => (t.hasViews ? ratio(t.views, t.scope.views.impressions) : null),
  },
  vtr6s: {
    key: "vtr6s",
    label: "VTR 6 s",
    short: "VTR 6s",
    description: "Views de 6 s ÷ Impressões (TikTok).",
    format: "pct",
    kind: "ratio",
    platforms: ["tiktok"],
    higherIsBetter: true,
    compute: (t) => (t.hasViews6s ? ratio(t.views6s, t.scope.views6s.impressions) : null),
  },
  completion: {
    key: "completion",
    label: "Taxa de conclusão",
    short: "Conclusão",
    description: "Views completas ÷ Visualizações.",
    format: "pct",
    kind: "ratio",
    platforms: VIDEO,
    higherIsBetter: true,
    compute: (t) => (t.hasQuartiles && t.hasViews ? ratio(t.p100, t.views) : null),
  },
  engRate: {
    key: "engRate",
    label: "Taxa de engajamento",
    short: "Tx. engaj.",
    description: "Engajamentos ÷ Impressões (Google/YouTube).",
    format: "pct",
    kind: "ratio",
    platforms: ["google", "youtube"],
    higherIsBetter: true,
    compute: (t) => (t.hasEngagements ? ratio(t.engagements, t.scope.engagements.impressions) : null),
  },
};

export const METRIC_LIST: MetricDef[] = Object.values(METRICS);

/** Métricas disponíveis para um conjunto de plataformas (união). */
export function metricsFor(platforms: Platform[] | "all"): MetricDef[] {
  if (platforms === "all") return METRIC_LIST;
  return METRIC_LIST.filter((m) => m.platforms.some((p) => platforms.includes(p)));
}

export function metricValue(key: MetricKey, t: Totals): number | null {
  return METRICS[key].compute(t);
}

/* ------------------------------------------------------------------ */
/* Agrupamentos                                                        */
/* ------------------------------------------------------------------ */

export interface Group<K extends string = string> {
  key: K;
  label: string;
  rows: Row[];
  totals: Totals;
}

export function groupBy<K extends string>(rows: Row[], keyOf: (r: Row) => K, labelOf: (k: K, r: Row) => string = (k) => k): Group<K>[] {
  const map = new Map<K, { label: string; rows: Row[] }>();
  for (const r of rows) {
    const k = keyOf(r);
    let g = map.get(k);
    if (!g) {
      g = { label: labelOf(k, r), rows: [] };
      map.set(k, g);
    }
    g.rows.push(r);
  }
  return Array.from(map.entries()).map(([key, g]) => ({ key, label: g.label, rows: g.rows, totals: aggregate(g.rows) }));
}

/** Série diária de uma métrica (dias sem dados → null, para o gráfico não inventar zero). */
export function dailySeries(rows: Row[], days: string[], key: MetricKey): { date: string; value: number | null }[] {
  const byDay = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byDay.get(r.date);
    if (arr) arr.push(r);
    else byDay.set(r.date, [r]);
  }
  return days.map((date) => {
    const dr = byDay.get(date);
    if (!dr || dr.length === 0) return { date, value: null };
    return { date, value: metricValue(key, aggregate(dr)) };
  });
}

/** Participação de cada grupo em uma métrica somável. */
export function shareOf(groups: Group[], key: MetricKey): { key: string; label: string; value: number; share: number }[] {
  const vals = groups.map((g) => ({ key: g.key, label: g.label, value: metricValue(key, g.totals) ?? 0 }));
  const total = vals.reduce((a, b) => a + b.value, 0);
  return vals.map((v) => ({ ...v, share: total > 0 ? v.value / total : 0 }));
}
