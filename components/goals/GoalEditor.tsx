"use client";

import { useEffect, useState } from "react";
import { DEFAULT_GOALS, GOAL_METRIC_OPTIONS, type GoalMetric, type GoalsConfig, type PlatformGoal } from "@/lib/goals";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

interface GoalEditorProps {
  open: boolean;
  onClose: () => void;
  goals: GoalsConfig;
  mode: "normal" | "medx";
  onSave: (g: GoalsConfig) => void;
  onReset: () => void;
}

interface Draft {
  enabled: boolean;
  investment: string;
  metric: GoalMetric;
  target: string;
}

function toDraft(g: PlatformGoal | undefined): Draft {
  return {
    enabled: !!g,
    investment: g ? String(g.investment) : "",
    metric: g?.metric ?? "impressions",
    target: g ? String(g.target) : "",
  };
}

/** Aceita "1.312,50", "1312,50", "1312.50" e "627.586" (milhar pt-BR). */
function parseNum(s: string): number {
  const raw = s.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (raw === "") return 0;
  let normalized: string;
  if (raw.includes(",")) {
    // vírgula é sempre o decimal em pt-BR; pontos são separadores de milhar
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    // "9.100" e "627.586" são milhares, não decimais
    normalized = raw.replace(/\./g, "");
  } else {
    normalized = raw;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function GoalEditor({ open, onClose, goals, mode, onSave, onReset }: GoalEditorProps) {
  // Não há Google em MEDX: a plataforma nem aparece no editor nesse modo.
  const editable = mode === "medx" ? PLATFORMS.filter((p) => p !== "google") : PLATFORMS;
  const [start, setStart] = useState(goals.periodStart);
  const [end, setEnd] = useState(goals.periodEnd);
  const [drafts, setDrafts] = useState<Record<Platform, Draft>>({
    google: toDraft(goals[mode].google),
    youtube: toDraft(goals[mode].youtube),
    tiktok: toDraft(goals[mode].tiktok),
  });

  useEffect(() => {
    if (!open) return;
    setStart(goals.periodStart);
    setEnd(goals.periodEnd);
    setDrafts({ google: toDraft(goals[mode].google), youtube: toDraft(goals[mode].youtube), tiktok: toDraft(goals[mode].tiktok) });
  }, [open, goals, mode]);

  const update = (p: Platform, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [p]: { ...d[p], ...patch } }));

  const save = () => {
    const next: Partial<Record<Platform, PlatformGoal>> = {};
    for (const p of editable) {
      const d = drafts[p];
      if (!d.enabled) continue;
      next[p] = { investment: parseNum(d.investment), metric: d.metric, target: parseNum(d.target) };
    }
    onSave({ ...goals, periodStart: start, periodEnd: end, [mode]: next });
    onClose();
  };

  const input = "mt-0.5 block h-9 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-[13px] text-ink";

  return (
    <Modal open={open} onClose={onClose} title={`Editar metas — ${mode === "medx" ? "MEDX" : "campanha comum"}`} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] font-medium text-muted">
            Início do período
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
          </label>
          <label className="text-[11px] font-medium text-muted">
            Fim do período
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
          </label>
        </div>
        <div className="space-y-3">
          {editable.map((p) => {
            const d = drafts[p];
            return (
              <fieldset key={p} className={`rounded-2xl border border-line p-3 ${d.enabled ? "" : "opacity-70"}`}>
                <legend className="px-1">
                  <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <input type="checkbox" checked={d.enabled} onChange={(e) => update(p, { enabled: e.target.checked })} className="h-4 w-4 accent-[#0e2f4f]" />
                    {PLATFORM_LABEL[p]}
                  </label>
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-[11px] font-medium text-muted">
                    Investimento (R$)
                    <input type="text" inputMode="decimal" value={d.investment} disabled={!d.enabled} onChange={(e) => update(p, { investment: e.target.value })} className={input} placeholder="0,00" />
                  </label>
                  <label className="text-[11px] font-medium text-muted">
                    Métrica principal
                    <select value={d.metric} disabled={!d.enabled} onChange={(e) => update(p, { metric: e.target.value as GoalMetric })} className={input}>
                      {GOAL_METRIC_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-medium text-muted">
                    Meta
                    <input type="text" inputMode="numeric" value={d.target} disabled={!d.enabled} onChange={(e) => update(p, { target: e.target.value })} className={input} placeholder="0" />
                  </label>
                </div>
              </fieldset>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              onReset();
              setStart(DEFAULT_GOALS.periodStart);
              setEnd(DEFAULT_GOALS.periodEnd);
              setDrafts({ google: toDraft(DEFAULT_GOALS[mode].google), youtube: toDraft(DEFAULT_GOALS[mode].youtube), tiktok: toDraft(DEFAULT_GOALS[mode].tiktok) });
            }}
            className="text-[12px] font-medium text-muted hover:text-ink"
          >
            Restaurar metas padrão
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-full border border-line px-4 text-[13px] font-medium text-ink-2 hover:bg-surface-3">
              Cancelar
            </button>
            <button type="button" onClick={save} className="h-9 rounded-full bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-2">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
