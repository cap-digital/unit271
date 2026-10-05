import { reconcilePlaces } from "./places";
import type { Dataset, PlacePlatform, Platform, PlaceRow, RawPayload, Row } from "./types";

type Raw = Record<string, unknown>;

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const raw = v.trim().replace(/^R\$\s*/i, "").replace(/%$/, "");
    if (raw === "") return 0;
    // "22.43" (formato da API) → direto; "1.234,56" (pt-BR) → remove pontos e troca vírgula
    const s = /,/.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  return num(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

/**
 * Primeiro campo presente entre os nomes aceitos. A API já mandou as colunas
 * com rótulos ("Campaign Name", "Date (Segment)") e passou a mandar em
 * snake_case ("campaign", "date"); os dois formatos são lidos.
 */
function pick(r: Raw, ...keys: string[]): unknown {
  for (const k of keys) if (r[k] !== undefined) return r[k];
  return undefined;
}

/** "2026-08-31T03:00:00.000Z" → "2026-08-31" (a API envia meia-noite de Brasília). */
export function toISODate(v: unknown): string {
  const s = str(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  // fallback: interpreta no fuso de Brasília
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isMedxCampaign(campaign: string): boolean {
  return /\bMEDX\b/i.test(campaign);
}

/** Taxa de quartil (0–1) × impressões → contagem inteira. */
function quartileCount(rate: unknown, impressions: number): number | null {
  if (rate === null || rate === undefined || rate === "") return null;
  const r = num(rate);
  return Math.round(r * impressions);
}

/** Força https em thumbnails do TikTok (a CDN aceita e evita mixed content). */
export function secureUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeGoogle(rows: Raw[]): Row[] {
  return rows.map((r, i) => {
    const campaign = str(pick(r, "campaign", "Campaign Name"));
    const ad = str(pick(r, "ad_name", "Ad Name")) || "Anúncio";
    const adGroup = str(pick(r, "ad_group_name", "Ad Group Name"));
    const impressions = num(pick(r, "impressions", "Impressions"));
    return {
      id: `g-${i}`,
      platform: "google",
      date: toISODate(pick(r, "date", "Date (Segment)", "Date")),
      campaign,
      adGroup,
      ad,
      creativeId: `google:${slug(campaign)}:${slug(adGroup)}:${slug(ad)}`,
      creativeTitle: ad,
      creativeUrl: str(r["Thumbnail URL"]) || null,
      isMedx: isMedxCampaign(campaign),
      investment: num(r["Investimento"]),
      impressions,
      clicks: num(pick(r, "clicks", "Clicks")),
      engagements: numOrNull(pick(r, "engagements", "Engagements")) ?? 0,
      views: null,
      views6s: null,
      p25: null,
      p50: null,
      p75: null,
      p100: null,
      age: null,
      gender: null,
    };
  });
}

function normalizeYouTube(rows: Raw[]): Row[] {
  return rows.map((r, i) => {
    const campaign = str(pick(r, "campaign", "Campaign Name"));
    const ad = str(pick(r, "ad_name", "Ad Name")) || "Anúncio";
    const adGroup = str(pick(r, "ad_group_name", "Ad Group Name"));
    const url = str(r["URL Video"]) || null;
    const impressions = num(pick(r, "impressions", "Impressions"));
    return {
      id: `y-${i}`,
      platform: "youtube",
      date: toISODate(pick(r, "date", "Date (Segment)", "Date")),
      campaign,
      adGroup,
      ad,
      creativeId: `youtube:${slug(campaign)}:${slug(adGroup)}:${slug(ad)}`,
      creativeTitle: ad,
      creativeUrl: url,
      isMedx: isMedxCampaign(campaign),
      investment: num(r["Investimento"]),
      impressions,
      clicks: num(pick(r, "clicks", "Clicks")),
      engagements: numOrNull(pick(r, "engagements", "Engagements")) ?? 0,
      views: num(pick(r, "video_trueview_views", "Video Trueview Views")),
      views6s: null,
      p25: quartileCount(pick(r, "video_quartile25_rate", "Video Quartile P25 Rate"), impressions) ?? 0,
      p50: quartileCount(pick(r, "video_quartile50_rate", "Video Quartile P50 Rate"), impressions) ?? 0,
      p75: quartileCount(pick(r, "video_quartile75_rate", "Video Quartile P75 Rate"), impressions) ?? 0,
      p100: quartileCount(pick(r, "video_quartile100_rate", "Video Quartile P100 Rate"), impressions) ?? 0,
      age: null,
      gender: null,
    };
  });
}

const AGE_LABEL: Record<string, string> = {
  AGE_13_17: "13–17",
  AGE_18_24: "18–24",
  AGE_25_34: "25–34",
  AGE_35_44: "35–44",
  AGE_45_54: "45–54",
  AGE_55_100: "55+",
  AGE_55_PLUS: "55+",
};

export function ageLabel(code: string | null): string {
  if (!code) return "Não informado";
  if (AGE_LABEL[code]) return AGE_LABEL[code];
  const m = code.match(/AGE_(\d+)_(\d+)/);
  if (m) return `${m[1]}–${m[2]}`;
  return code;
}

const GENDER_LABEL: Record<string, string> = {
  FEMALE: "Feminino",
  MALE: "Masculino",
  NONE: "Não informado",
  UNKNOWN: "Não informado",
};

export function genderLabel(code: string | null): string {
  if (!code) return "Não informado";
  return GENDER_LABEL[code.toUpperCase()] ?? code;
}

function normalizeTikTok(rows: Raw[]): Row[] {
  return rows.map((r, i) => {
    const campaign = str(pick(r, "campaign", "Campaign Name"));
    const ad = str(pick(r, "ad_name", "Ad Name")) || "Anúncio";
    const adGroup = str(pick(r, "ad_group_name", "Adgroup Name", "Ad Group Name"));
    return {
      id: `t-${i}`,
      platform: "tiktok",
      date: toISODate(pick(r, "date", "Date", "Date (Segment)")),
      campaign,
      adGroup,
      ad,
      creativeId: `tiktok:${slug(campaign)}:${slug(adGroup)}:${slug(ad)}`,
      creativeTitle: ad,
      creativeUrl: secureUrl(str(pick(r, "video_thumbnail_url", "Video Thumbnail URL")) || null),
      isMedx: isMedxCampaign(campaign),
      investment: num(r["Investimento"]),
      impressions: num(pick(r, "impressions", "Impressions")),
      clicks: num(pick(r, "clicks", "Clicks")),
      engagements: null,
      views: num(pick(r, "play_duration_2s", "2-Second Video Views")),
      views6s: num(pick(r, "play_duration_6s", "6-Second Video Views")),
      p25: num(pick(r, "play_first_quartile", "Video Views at 25 Percent")),
      p50: num(pick(r, "play_midpoint", "Video Views at 50 Percent")),
      p75: num(pick(r, "play_third_quartile", "Video Views at 75 Percent")),
      p100: num(pick(r, "play_over", "Video Views at 100 Percent")),
      age: str(pick(r, "age", "Age (Audience Dimension)")) || null,
      gender: str(pick(r, "gender", "Gender (Audience Dimension)")) || null,
    };
  });
}

/** Praças (Geo Target City) — só Google e YouTube reportam essa dimensão. */
function normalizePlaces(rows: Raw[], platform: PlacePlatform): PlaceRow[] {
  return rows.map((r, i) => {
    const campaign = str(pick(r, "campaign", "Campaign Name"));
    return {
      id: `p-${platform}-${i}`,
      platform,
      date: toISODate(pick(r, "date", "Date (Segment)", "Date")),
      campaign,
      city: str(pick(r, "city", "Geo Target City (Segment)")) || "Não informada",
      isMedx: isMedxCampaign(campaign),
      investment: num(r["Investimento"]),
      impressions: num(pick(r, "impressions", "Impressions")),
      clicks: num(pick(r, "clicks", "Clicks")),
      views: platform === "youtube" ? num(pick(r, "video_trueview_views", "Video Trueview Views")) : null,
    };
  });
}

export function normalizePayload(payload: RawPayload, fetchedAt: string): Dataset {
  const rows: Row[] = [
    ...normalizeGoogle(Array.isArray(payload.google) ? payload.google : []),
    ...normalizeYouTube(Array.isArray(payload.youtube) ? payload.youtube : []),
    ...normalizeTikTok(Array.isArray(payload.tiktok) ? payload.tiktok : []),
  ].filter((r) => r.date !== "");
  const places: PlaceRow[] = [
    ...normalizePlaces(Array.isArray(payload.pracasgoogle) ? payload.pracasgoogle : [], "google"),
    ...normalizePlaces(Array.isArray(payload.pracasyoutube) ? payload.pracasyoutube : [], "youtube"),
  ].filter((r) => r.date !== "");
  return { rows, placeRows: reconcilePlaces(places, rows), timestamp: payload.timestamp ?? null, fetchedAt };
}

export function platformOf(row: Row): Platform {
  return row.platform;
}
