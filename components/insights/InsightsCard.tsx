"use client";

import { Coins, Eye, MousePointerClick, Sparkles, Target, TrendingUp, Users, Video, type LucideIcon } from "lucide-react";
import type { Insight, InsightIcon } from "@/lib/insights";
import { Card } from "@/components/ui/Card";

const ICONS: Record<InsightIcon, LucideIcon> = {
  money: Coins,
  eye: Eye,
  cursor: MousePointerClick,
  video: Video,
  users: Users,
  trend: TrendingUp,
  target: Target,
  sparkle: Sparkles,
};

interface InsightsCardProps {
  insights: Insight[];
  title?: string;
  className?: string;
  /** Altura máxima da lista antes de rolar dentro do card (px ou CSS). */
  maxBodyHeight?: number | string;
  /** Uma coluna (quando o card ocupa pouca largura no grid). */
  singleColumn?: boolean;
}

export function InsightsCard({ insights, title = "Leitura dos dados", className, maxBodyHeight, singleColumn = false }: InsightsCardProps) {
  if (insights.length === 0) return null;
  return (
    <Card title={title} subtitle="Análise descritiva gerada automaticamente a partir do período e do modo selecionados." className={className}>
      <ul
        className={`grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto ${singleColumn ? "" : "sm:grid-cols-2"} ${maxBodyHeight ? "" : "max-h-[25vh] min-h-[150px] sm:max-h-[26vh]"}`}
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
      >
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.icon];
          const tone = ins.tone === "good" ? "bg-[#eaf6ea] text-good-text" : ins.tone === "warn" ? "bg-gold-soft text-warn-text" : "bg-navy-soft text-navy";
          return (
            <li key={i} className="flex items-start gap-2.5 rounded-2xl bg-surface-2 px-3 py-2">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="text-[12.5px] leading-snug text-ink">{ins.text}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
