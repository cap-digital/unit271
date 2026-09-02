import type { Platform } from "./types";

/**
 * Cores de série. Validadas com o validador de paleta (adjacente e todos-os-pares,
 * superfície #ffffff): Google/YouTube/TikTok = slots 1–3 da paleta de referência.
 * O verde-água fica abaixo de 3:1 no fundo claro, por isso todo gráfico tem
 * rótulos/tooltip e visão em tabela (canal de alívio).
 */
export const PLATFORM_COLOR: Record<Platform, string> = {
  google: "#2a78d6",
  youtube: "#eb6834",
  tiktok: "#1baf7a",
};

export const TOTAL_COLOR = "#0e2f4f";
export const OTHER_COLOR = "#9aa4b2";
export const DEEMPHASIS_COLOR = "#c9d1db";
export const ACCENT_COLOR = "#f4b532";

/** Rampa ordinal (uma matiz, claro → escuro) — validada com --ordinal. */
export const ORDINAL_RAMP = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

/** Slots categóricos na ordem fixa da paleta de referência (nunca ciclar). */
export const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

export const GENDER_COLOR: Record<string, string> = {
  FEMALE: "#2a78d6",
  MALE: "#eb6834",
  NONE: OTHER_COLOR,
  UNKNOWN: OTHER_COLOR,
};

export const CHART_CHROME = {
  grid: "#e8ecf1",
  axis: "#cbd3dd",
  muted: "#7c8a9c",
  ink: "#0f1f33",
  surface: "#ffffff",
};

/** Escolhe o ramp ordinal com N passos (≤ 5) ou repete a matiz base para mais. */
export function ordinalSteps(n: number): string[] {
  if (n <= 0) return [];
  if (n === 1) return [ORDINAL_RAMP[2]];
  if (n <= ORDINAL_RAMP.length) {
    // distribui uniformemente sobre a rampa validada
    const idx = Array.from({ length: n }, (_, i) => Math.round((i * (ORDINAL_RAMP.length - 1)) / (n - 1)));
    return idx.map((i) => ORDINAL_RAMP[i]);
  }
  return Array.from({ length: n }, () => ORDINAL_RAMP[2]);
}

/** Tinta legível sobre um preenchimento (branco em cores escuras, navy em claras). */
export function inkOn(fill: string): string {
  const hex = fill.replace("#", "");
  const v = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const n = parseInt(v, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWhite = 1.05 / (L + 0.05);
  return contrastWhite >= 4.5 ? "#ffffff" : "#0f1f33";
}
