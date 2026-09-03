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

export interface CampaignGoals {
  /** Período de veiculação contratado (base do ritmo esperado). */
  periodStart: string;
  periodEnd: string;
  platforms: Partial<Record<Platform, PlatformGoal>>;
}

export interface GoalsConfig {
  normal: CampaignGoals;
  medx: CampaignGoals;
}

/**
 * Metas e períodos informados pelo cliente.
 * Campanha 27.1 (31/08 a 18/10): TikTok 9.100 / 627.586 impressões ·
 * YouTube 12.600 / 70.000 views · Google 9.800 / 1.256 cliques.
 * MEDX (01/09 a 13/09): TikTok 1.000 / 68.966 impressões ·
 * YouTube 1.312,50 / 7.292 views (não há Google em MEDX).
 */
export const GOALS: GoalsConfig = {
  normal: {
    periodStart: "2026-08-31",
    periodEnd: "2026-10-18",
    platforms: {
      tiktok: { investment: 9100, metric: "impressions", target: 627586 },
      youtube: { investment: 12600, metric: "views", target: 70000 },
      google: { investment: 9800, metric: "clicks", target: 1256 },
    },
  },
  medx: {
    periodStart: "2026-09-01",
    periodEnd: "2026-09-13",
    platforms: {
      tiktok: { investment: 1000, metric: "impressions", target: 68966 },
      youtube: { investment: 1312.5, metric: "views", target: 7292 },
    },
  },
};

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
