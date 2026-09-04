import { aggregate, type Totals } from "./metrics";
import type { PlacePlatform, PlaceRow, Row } from "./types";

/** Campos numéricos das praças que passam pela reconciliação. */
type PlaceMetric = "investment" | "impressions" | "clicks" | "views";

const INTEGER_METRICS: PlaceMetric[] = ["impressions", "clicks", "views"];

/**
 * Distribui `target` entre `values` mantendo a proporção original.
 *
 * Para contagens (`unit = 1`) usa o método do maior resto, então a soma das
 * partes inteiras é exatamente o alvo. Para valores contínuos (`unit = 0`,
 * usado no investimento) reparte sem quantizar: arredondar centavo a centavo
 * por dia faria a soma do período fugir do total da plataforma.
 */
function apportion(values: number[], target: number, unit: number): number[] {
  const source = values.reduce((a, b) => a + b, 0);
  if (target <= 0) return values.map(() => 0);
  // sem base para distribuir (todas as praças zeradas): mantém como está
  if (source <= 0) return values.slice();
  if (unit === 0) return values.map((v) => (v / source) * target);
  const perUnit = Math.round(1 / unit);
  const targetUnits = Math.round(target * perUnit);
  const raw = values.map((v) => (v / source) * targetUnits);
  const parts = raw.map(Math.floor);
  let rest = targetUnits - parts.reduce((a, b) => a + b, 0);
  const byRemainder = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0 && k < byRemainder.length; k++, rest--) parts[byRemainder[k].i]++;
  return parts.map((p) => p / perUnit);
}

function keyOf(platform: string, date: string, isMedx: boolean): string {
  return `${platform}|${date}|${isMedx ? "medx" : "base"}`;
}

/**
 * Ajusta as praças aos totais da plataforma.
 *
 * A extração por cidade (Geo Target City) não fecha com o relatório da campanha
 * — no Google chega a divergir 15% em cliques —, então o recorte por praça
 * mostraria números diferentes dos da própria página. O ajuste é feito por dia
 * e por métrica: cada praça mantém sua participação no dia e a soma passa a ser
 * exatamente o total da plataforma, para qualquer filtro de período.
 */
export function reconcilePlaces(placeRows: PlaceRow[], rows: Row[]): PlaceRow[] {
  if (placeRows.length === 0) return placeRows;

  // alvo: totais da plataforma por dia
  const targets = new Map<string, { investment: number; impressions: number; clicks: number; views: number }>();
  for (const r of rows) {
    if (r.platform !== "google" && r.platform !== "youtube") continue;
    const k = keyOf(r.platform, r.date, r.isMedx);
    const t = targets.get(k) ?? { investment: 0, impressions: 0, clicks: 0, views: 0 };
    t.investment += r.investment;
    t.impressions += r.impressions;
    t.clicks += r.clicks;
    t.views += r.views ?? 0;
    targets.set(k, t);
  }

  const groups = new Map<string, PlaceRow[]>();
  for (const p of placeRows) {
    const k = keyOf(p.platform, p.date, p.isMedx);
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }

  const out: PlaceRow[] = [];
  for (const [k, group] of groups) {
    const target = targets.get(k);
    // dia sem contrapartida na plataforma: não há alvo para ajustar
    if (!target) {
      out.push(...group);
      continue;
    }
    const adjusted = group.map((p) => ({ ...p }));
    for (const metric of ["investment", "impressions", "clicks", "views"] as PlaceMetric[]) {
      if (metric === "views" && group[0].views === null) continue;
      const values = adjusted.map((p) => (metric === "views" ? (p.views ?? 0) : p[metric]));
      const unit = INTEGER_METRICS.includes(metric) ? 1 : 0;
      const shares = apportion(values, target[metric], unit);
      adjusted.forEach((p, i) => {
        if (metric === "views") p.views = shares[i];
        else p[metric] = shares[i];
      });
    }
    out.push(...adjusted);
  }
  return out;
}

/** Converte praças em linhas de métrica para reaproveitar CPM/CPC/CTR/CPV/VTR. */
export function aggregatePlaces(placeRows: PlaceRow[]): Totals {
  const asRows: Row[] = placeRows.map((p) => ({
    id: p.id,
    platform: p.platform,
    date: p.date,
    campaign: p.campaign,
    adGroup: "",
    ad: p.city,
    creativeId: p.city,
    creativeTitle: p.city,
    creativeUrl: null,
    isMedx: p.isMedx,
    investment: p.investment,
    impressions: p.impressions,
    clicks: p.clicks,
    engagements: null,
    views: p.views,
    views6s: null,
    p25: null,
    p50: null,
    p75: null,
    p100: null,
    age: null,
    gender: null,
  }));
  return aggregate(asRows);
}

export interface PlaceGroup {
  city: string;
  totals: Totals;
  rows: PlaceRow[];
}

/** Agrupa por cidade, da maior para a menor participação em investimento. */
export function groupByCity(placeRows: PlaceRow[]): PlaceGroup[] {
  const map = new Map<string, PlaceRow[]>();
  for (const p of placeRows) {
    const g = map.get(p.city);
    if (g) g.push(p);
    else map.set(p.city, [p]);
  }
  return Array.from(map.entries())
    .map(([city, rows]) => ({ city, rows, totals: aggregatePlaces(rows) }))
    .sort((a, b) => b.totals.investment - a.totals.investment);
}

export function placeRowsFor(placeRows: PlaceRow[], platform: PlacePlatform, medx: boolean, start: string, end: string): PlaceRow[] {
  return placeRows.filter((p) => p.platform === platform && p.isMedx === medx && p.date >= start && p.date <= end);
}
