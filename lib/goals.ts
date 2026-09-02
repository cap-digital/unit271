import type { MetricKey } from "./metrics";
import type { Platform } from "./types";

export type GoalMetric = Extract<MetricKey, "impressions" | "views" | "clicks">;

export interface PlatformGoal {
  /** Meta de investimento (R$). */
  investment: number;
  /** Métrica principal contratada para a plataforma. */
  metric: GoalMetric;
  /** Meta da métrica principal. */
  target: number;
}

export interface GoalsConfig {
  /** Período de referência para o ritmo (pacing). */
  periodStart: string;
  periodEnd: string;
  normal: Partial<Record<Platform, PlatformGoal>>;
  medx: Partial<Record<Platform, PlatformGoal>>;
}

/**
 * Metas informadas pelo cliente (setembro/2026).
 * Campanha comum: TikTok 9.100 / 627.586 impressões · YouTube 12.600 / 70.000 views · Google 9.800 / 1.256 cliques.
 * MEDX: TikTok 1.000 / 68.966 impressões · YouTube 1.312,50 / 7.292 views (não há Google em MEDX).
 */
export const DEFAULT_GOALS: GoalsConfig = {
  periodStart: "2026-08-31",
  periodEnd: "2026-09-30",
  normal: {
    tiktok: { investment: 9100, metric: "impressions", target: 627586 },
    youtube: { investment: 12600, metric: "views", target: 70000 },
    google: { investment: 9800, metric: "clicks", target: 1256 },
  },
  medx: {
    tiktok: { investment: 1000, metric: "impressions", target: 68966 },
    youtube: { investment: 1312.5, metric: "views", target: 7292 },
  },
};

export const GOAL_METRIC_OPTIONS: { key: GoalMetric; label: string }[] = [
  { key: "impressions", label: "Impressões" },
  { key: "views", label: "Visualizações" },
  { key: "clicks", label: "Cliques" },
];

/** Custo unitário implícito na meta (CPM/CPV/CPC alvo). */
export function impliedUnitCost(goal: PlatformGoal): { label: string; value: number | null; key: MetricKey } {
  if (goal.target <= 0) return { label: unitLabel(goal.metric), value: null, key: unitKey(goal.metric) };
  const raw = goal.investment / goal.target;
  return {
    label: unitLabel(goal.metric),
    value: goal.metric === "impressions" ? raw * 1000 : raw,
    key: unitKey(goal.metric),
  };
}

export function unitLabel(metric: GoalMetric): string {
  return metric === "impressions" ? "CPM" : metric === "views" ? "CPV" : "CPC";
}

export function unitKey(metric: GoalMetric): MetricKey {
  return metric === "impressions" ? "cpm" : metric === "views" ? "cpv" : "cpc";
}

export function sanitizeGoals(input: unknown): GoalsConfig {
  const base: GoalsConfig = JSON.parse(JSON.stringify(DEFAULT_GOALS));
  if (!input || typeof input !== "object") return base;
  const obj = input as Partial<GoalsConfig>;
  const iso = (v: unknown, fallback: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback);
  const goal = (v: unknown): PlatformGoal | undefined => {
    if (!v || typeof v !== "object") return undefined;
    const g = v as Partial<PlatformGoal>;
    const metric: GoalMetric = g.metric === "views" || g.metric === "clicks" ? g.metric : "impressions";
    const investment = Number(g.investment);
    const target = Number(g.target);
    if (!Number.isFinite(investment) || !Number.isFinite(target)) return undefined;
    return { investment: Math.max(0, investment), metric, target: Math.max(0, target) };
  };
  const pick = (src: unknown): Partial<Record<Platform, PlatformGoal>> => {
    const out: Partial<Record<Platform, PlatformGoal>> = {};
    if (!src || typeof src !== "object") return out;
    for (const p of ["google", "youtube", "tiktok"] as Platform[]) {
      const g = goal((src as Record<string, unknown>)[p]);
      if (g) out[p] = g;
    }
    return out;
  };
  return {
    periodStart: iso(obj.periodStart, base.periodStart),
    periodEnd: iso(obj.periodEnd, base.periodEnd),
    normal: obj.normal ? pick(obj.normal) : base.normal,
    medx: obj.medx ? pick(obj.medx) : base.medx,
  };
}
