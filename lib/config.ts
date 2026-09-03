/**
 * Configuração de acesso à base de dados (Supabase Edge Function).
 * A chave é do tipo "publishable" (pública por desenho); pode ser sobrescrita
 * por variáveis NEXT_PUBLIC_* em .env.local sem alterar o código.
 */
export const DATA_ENDPOINT =
  process.env.NEXT_PUBLIC_DATA_ENDPOINT ??
  "https://cqrpbiepyeypbkizwacu.supabase.co/functions/v1/Unit271";

export const DATA_KEY =
  process.env.NEXT_PUBLIC_DATA_KEY ??
  "sb_publishable_YN9YKLw6sludrgf9T2i_1g_Dcm8dIiK";

/** Corpo enviado à função (é o que o endpoint espera). */
export const DATA_BODY = { name: "Functions" };

/** Tempo máximo de espera pela API (a carga fria já levou ~75 s). */
export const FETCH_TIMEOUT_MS = 180_000;

/** Intervalo de atualização automática em segundo plano. */
export const AUTO_REFRESH_MS = 10 * 60 * 1000;

/** Fuso de referência das campanhas (datas vêm à meia-noite de Brasília). */
export const TIMEZONE = "America/Sao_Paulo";

export const STORAGE_KEYS = {
  data: "unit271:data:v1",
  medx: "unit271:medx:v1",
  range: "unit271:range:v1",
} as const;
