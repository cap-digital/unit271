export type Platform = "google" | "youtube" | "tiktok";

export const PLATFORMS: Platform[] = ["google", "youtube", "tiktok"];

export const PLATFORM_LABEL: Record<Platform, string> = {
  google: "Google",
  youtube: "YouTube",
  tiktok: "TikTok",
};

/** Linha normalizada — uma por (plataforma, dia, anúncio[, faixa etária, gênero]). */
export interface Row {
  id: string;
  platform: Platform;
  /** YYYY-MM-DD no fuso das campanhas. */
  date: string;
  campaign: string;
  adGroup: string;
  ad: string;
  /** Chave estável para agrupar linhas do mesmo criativo. */
  creativeId: string;
  /** Nome amigável do criativo (título do vídeo ou nome do anúncio). */
  creativeTitle: string;
  /** URL original do criativo (YouTube, Drive ou thumbnail TikTok). */
  creativeUrl: string | null;
  isMedx: boolean;

  /** Investimento (valor bruto) — única base de custo usada no dashboard. */
  investment: number;
  impressions: number;
  clicks: number;
  /** null quando a plataforma não reporta a métrica. */
  engagements: number | null;
  /** YouTube: TrueView views · TikTok: views de 2 s · Google: n/d. */
  views: number | null;
  /** TikTok: views de 6 s. */
  views6s: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p100: number | null;

  /** Dimensões de público (somente TikTok). */
  age: string | null;
  gender: string | null;
}

export interface RawPayload {
  success?: boolean;
  timestamp?: string;
  google?: Record<string, unknown>[];
  youtube?: Record<string, unknown>[];
  tiktok?: Record<string, unknown>[];
}

export interface Dataset {
  rows: Row[];
  /** Carimbo de tempo informado pela API. */
  timestamp: string | null;
  /** Momento em que o payload foi baixado pelo navegador (ISO). */
  fetchedAt: string;
}
