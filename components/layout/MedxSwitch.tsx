"use client";

import { useDashboard } from "@/store/DashboardContext";

interface MedxSwitchProps {
  layout?: "vertical" | "horizontal";
}

/** Switch MEDX: ligado mostra somente a campanha MEDX; desligado, somente a campanha comum. */
export function MedxSwitch({ layout = "vertical" }: MedxSwitchProps) {
  const { medx, setMedx, switching } = useDashboard();
  const vertical = layout === "vertical";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={medx}
      aria-label={medx ? "Modo MEDX ativo. Desativar para ver a campanha comum" : "Ativar modo MEDX"}
      onClick={() => setMedx(!medx)}
      disabled={switching}
      className={`group flex items-center gap-1.5 rounded-2xl px-2 py-2 transition-colors hover:bg-surface-3 disabled:cursor-wait ${vertical ? "flex-col" : "flex-row"}`}
      title="Alterna entre a campanha MEDX e a campanha comum"
    >
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${medx ? "bg-gold" : "bg-[#c9d1db]"}`} aria-hidden>
        <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${medx ? "translate-x-5" : "translate-x-0"}`} />
      </span>
      <span className={`text-[10px] font-bold tracking-wide ${medx ? "text-navy" : "text-muted"}`}>MEDX</span>
    </button>
  );
}
