import { groupCreatives } from "./creatives";
import { fmtCurrency, fmtInt, fmtPct, fmtSignedPct, relChange } from "./format";
import { aggregate, groupBy, metricValue, type Totals } from "./metrics";
import { ageLabel, genderLabel } from "./normalize";
import { PLATFORM_LABEL, type Platform, type Row } from "./types";
import { fmtDay } from "./dates";

export type InsightTone = "neutral" | "good" | "warn";
export type InsightIcon = "money" | "eye" | "cursor" | "video" | "users" | "trend" | "target" | "sparkle";

export interface Insight {
  icon: InsightIcon;
  tone: InsightTone;
  text: string;
}

interface Ctx {
  rows: Row[];
  platform: Platform | "all";
  today: string;
}

function pctOf(n: number, d: number): string {
  return d > 0 ? fmtPct(n / d, 1) : "—";
}

function platformTotals(rows: Row[]): { platform: Platform; totals: Totals }[] {
  return groupBy(rows, (r) => r.platform)
    .map((g) => ({ platform: g.key as Platform, totals: g.totals }))
    .filter((g) => g.totals.investment > 0 || g.totals.impressions > 0);
}

function investmentShare(rows: Row[]): Insight | null {
  const pts = platformTotals(rows);
  if (pts.length < 2) return null;
  const total = pts.reduce((a, b) => a + b.totals.investment, 0);
  if (total <= 0) return null;
  const sorted = [...pts].sort((a, b) => b.totals.investment - a.totals.investment);
  const lead = sorted[0];
  const rest = sorted
    .slice(1)
    .map((p) => `${PLATFORM_LABEL[p.platform]} ${pctOf(p.totals.investment, total)}`)
    .join(" e ");
  return {
    icon: "money",
    tone: "neutral",
    text: `${PLATFORM_LABEL[lead.platform]} concentrou ${pctOf(lead.totals.investment, total)} do investimento (${fmtCurrency(lead.totals.investment)}); ${rest}.`,
  };
}

function cheapestCpm(rows: Row[]): Insight | null {
  const pts = platformTotals(rows)
    .map((p) => ({ ...p, cpm: metricValue("cpm", p.totals) }))
    .filter((p) => p.cpm !== null && p.totals.impressions >= 100) as { platform: Platform; totals: Totals; cpm: number }[];
  if (pts.length < 2) return null;
  const sorted = [...pts].sort((a, b) => a.cpm - b.cpm);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const diff = worst.cpm > 0 ? 1 - best.cpm / worst.cpm : 0;
  return {
    icon: "eye",
    tone: "good",
    text: `CPM mais eficiente no ${PLATFORM_LABEL[best.platform]} (${fmtCurrency(best.cpm)}), ${fmtPct(diff, 1)} abaixo do ${PLATFORM_LABEL[worst.platform]} (${fmtCurrency(worst.cpm)}).`,
  };
}

function ctrCompare(rows: Row[]): Insight | null {
  const pts = platformTotals(rows)
    .map((p) => ({ ...p, ctr: metricValue("ctr", p.totals) }))
    .filter((p) => p.ctr !== null && p.totals.impressions >= 100) as { platform: Platform; totals: Totals; ctr: number }[];
  if (pts.length < 2) return null;
  const sorted = [...pts].sort((a, b) => b.ctr - a.ctr);
  const best = sorted[0];
  const second = sorted[1];
  const times = second.ctr > 0 ? best.ctr / second.ctr : null;
  return {
    icon: "cursor",
    tone: "neutral",
    text: `${PLATFORM_LABEL[best.platform]} entregou o maior CTR (${fmtPct(best.ctr)})${times && times >= 1.5 ? `, ${times.toFixed(1).replace(".", ",")}× o do ${PLATFORM_LABEL[second.platform]} (${fmtPct(second.ctr)})` : ""}.`,
  };
}

function dayOverDay(rows: Row[], today: string): Insight | null {
  // Compara apenas dias completos: o dia de hoje ainda está em andamento.
  const days = [...new Set(rows.map((r) => r.date))].filter((d) => d !== today).sort();
  if (days.length < 2) {
    if (days.length === 1 && rows.some((r) => r.date === today)) {
      const tToday = aggregate(rows.filter((r) => r.date === today));
      const tFull = aggregate(rows.filter((r) => r.date === days[0]));
      if (tFull.impressions < 100) return null;
      return {
        icon: "trend",
        tone: "neutral",
        text: `${fmtDay(days[0])} fechou com ${fmtInt(tFull.impressions)} impressões e ${fmtCurrency(tFull.investment)} investidos; hoje (${fmtDay(today)}, parcial) já soma ${fmtInt(tToday.impressions)} ${tToday.impressions === 1 ? "impressão" : "impressões"} e ${fmtCurrency(tToday.investment)}.`,
      };
    }
    return null;
  }
  const last = days[days.length - 1];
  const prev = days[days.length - 2];
  const tLast = aggregate(rows.filter((r) => r.date === last));
  const tPrev = aggregate(rows.filter((r) => r.date === prev));
  // volumes muito baixos geram variações sem significado
  if (tPrev.impressions < 100) return null;
  const ch = relChange(tLast.impressions, tPrev.impressions);
  if (ch === null) return null;
  return {
    icon: "trend",
    tone: ch < -0.3 ? "warn" : "neutral",
    text: `Impressões em ${fmtDay(last)}: ${fmtInt(tLast.impressions)}, ${fmtSignedPct(ch)} vs ${fmtDay(prev)}; investimento de ${fmtCurrency(tLast.investment)} no dia.`,
  };
}

function videoAttention(rows: Row[]): Insight | null {
  const pts = platformTotals(rows.filter((r) => r.platform !== "google")).filter((p) => p.totals.hasQuartiles && p.totals.impressions >= 50);
  if (pts.length === 0) return null;
  const parts = pts.map((p) => `${PLATFORM_LABEL[p.platform]} ${pctOf(p.totals.p100, p.totals.impressions)}`);
  const withVtr = pts.map((p) => `${PLATFORM_LABEL[p.platform]} ${fmtPct(metricValue("vtr", p.totals), 1)}`);
  return {
    icon: "video",
    tone: "neutral",
    text: `Vídeos assistidos até o fim (sobre impressões): ${parts.join(" · ")}. VTR: ${withVtr.join(" · ")}.`,
  };
}

function biggestDrop(rows: Row[], platform: Platform): Insight | null {
  const t = aggregate(rows.filter((r) => r.platform === platform));
  if (!t.hasQuartiles || t.impressions < 50) return null;
  // Só trechos dentro do vídeo: a queda impressão → primeiro estágio é sempre a maior e não diz onde o público abandona.
  const stages: [string, number][] =
    platform === "tiktok"
      ? [
          ["2 s", t.views],
          ["6 s", t.views6s],
          ["25%", t.p25],
          ["50%", t.p50],
          ["75%", t.p75],
          ["100%", t.p100],
        ]
      : [
          ["25%", t.p25],
          ["50%", t.p50],
          ["75%", t.p75],
          ["100%", t.p100],
        ];
  let worst: { from: string; to: string; loss: number } | null = null;
  for (let i = 1; i < stages.length; i++) {
    const [fromL, fromV] = stages[i - 1];
    const [toL, toV] = stages[i];
    if (fromV < 10) continue;
    const loss = 1 - toV / fromV;
    if (!worst || loss > worst.loss) worst = { from: fromL, to: toL, loss };
  }
  if (!worst) return null;
  const kept = fmtPct(1 - worst.loss, 1);
  return {
    icon: "video",
    tone: worst.loss > 0.6 ? "warn" : "neutral",
    text: `Dentro do vídeo, o maior abandono no ${PLATFORM_LABEL[platform]} acontece entre ${worst.from} e ${worst.to}: só ${kept} de quem chega a ${worst.from} segue até ${worst.to}.`,
  };
}

function bestCreative(rows: Row[]): Insight | null {
  const groups = groupCreatives(rows.filter((r) => r.platform !== "google"));
  const scored = groups
    .map((g) => ({ g, t: aggregate(g.rows) }))
    .filter(({ t }) => t.impressions >= 20 && t.hasViews)
    .map(({ g, t }) => ({ g, t, vtr: metricValue("vtr", t) ?? 0 }))
    .sort((a, b) => b.vtr - a.vtr);
  if (scored.length < 2) return null;
  const best = scored[0];
  return {
    icon: "sparkle",
    tone: "good",
    text: `Criativo com melhor VTR: “${best.g.title}” (${PLATFORM_LABEL[best.g.platform]}) com ${fmtPct(best.vtr, 1)} em ${fmtInt(best.t.impressions)} impressões.`,
  };
}

function bestGoogleAd(rows: Row[]): Insight | null {
  const g = rows.filter((r) => r.platform === "google");
  if (g.length === 0) return null;
  const t = aggregate(g);
  if (t.impressions < 100) return null;
  return {
    icon: "cursor",
    tone: "neutral",
    text: `Google: ${fmtInt(t.clicks)} cliques a ${fmtCurrency(metricValue("cpc", t))} cada (CTR ${fmtPct(metricValue("ctr", t))}), com CPM de ${fmtCurrency(metricValue("cpm", t))}.`,
  };
}

function audience(rows: Row[]): Insight | null {
  const tk = rows.filter((r) => r.platform === "tiktok" && r.age);
  if (tk.length === 0) return null;
  const total = aggregate(tk);
  if (total.impressions < 100) return null;
  const byAge = groupBy(tk, (r) => r.age ?? "", (k) => ageLabel(k)).sort((a, b) => b.totals.impressions - a.totals.impressions);
  const byGender = groupBy(
    tk.filter((r) => r.gender && r.gender !== "NONE"),
    (r) => r.gender ?? "",
    (k) => genderLabel(k),
  ).sort((a, b) => b.totals.impressions - a.totals.impressions);
  const topAge = byAge[0];
  const topGender = byGender[0];
  const ageVtr = metricValue("vtr", topAge.totals);
  let text = `Faixa ${topAge.label} respondeu por ${pctOf(topAge.totals.impressions, total.impressions)} das impressões no TikTok`;
  if (ageVtr !== null) text += ` (VTR ${fmtPct(ageVtr, 1)})`;
  if (topGender) text += `; público ${topGender.label.toLowerCase()} foi ${pctOf(topGender.totals.impressions, total.impressions)} do alcance`;
  return { icon: "users", tone: "neutral", text: `${text}.` };
}

function bestAgeVtr(rows: Row[]): Insight | null {
  const tk = rows.filter((r) => r.platform === "tiktok" && r.age);
  if (tk.length === 0) return null;
  const byAge = groupBy(tk, (r) => r.age ?? "", (k) => ageLabel(k))
    .map((g) => ({ ...g, vtr: metricValue("vtr", g.totals), cpm: metricValue("cpm", g.totals) }))
    .filter((g) => g.totals.impressions >= 200 && g.vtr !== null);
  if (byAge.length < 2) return null;
  const best = [...byAge].sort((a, b) => (b.vtr ?? 0) - (a.vtr ?? 0))[0];
  const cheapest = [...byAge].sort((a, b) => (a.cpm ?? Infinity) - (b.cpm ?? Infinity))[0];
  return {
    icon: "target",
    tone: "good",
    text: `Faixa ${best.label} tem a melhor retenção (VTR ${fmtPct(best.vtr, 1)}); o CPM mais barato está em ${cheapest.label} (${fmtCurrency(cheapest.cpm)}).`,
  };
}

/** Frases descritivas calculadas a partir dos dados filtrados. */
export function buildInsights({ rows, platform, today }: Ctx): Insight[] {
  if (rows.length === 0) return [];
  const out: (Insight | null)[] = [];
  if (platform === "all") {
    out.push(investmentShare(rows), cheapestCpm(rows), ctrCompare(rows), videoAttention(rows), bestCreative(rows), audience(rows), dayOverDay(rows, today));
  } else if (platform === "google") {
    out.push(bestGoogleAd(rows), dayOverDay(rows, today));
  } else if (platform === "youtube") {
    out.push(videoAttention(rows), biggestDrop(rows, "youtube"), bestCreative(rows), dayOverDay(rows, today));
  } else {
    out.push(audience(rows), bestAgeVtr(rows), biggestDrop(rows, "tiktok"), bestCreative(rows), dayOverDay(rows, today));
  }
  return out.filter((i): i is Insight => i !== null).slice(0, 6);
}
