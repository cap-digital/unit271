import type { Platform, Row } from "./types";

export type PreviewKind = "youtube" | "drive" | "image" | "none";

export interface Preview {
  kind: PreviewKind;
  /** Imagem estática para o card (primeira candidata). */
  thumbUrl: string | null;
  /** Candidatas em ordem de preferência; o card tenta a próxima quando uma falha. */
  thumbCandidates: string[];
  /** URL para iframe (YouTube/Drive). */
  embedUrl: string | null;
  /** Link externo para abrir o original. */
  openUrl: string | null;
  /** Vídeo vertical (shorts/TikTok)? Ajuda a escolher a proporção do player. */
  vertical: boolean;
}

export function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ||
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ||
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export function driveId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function previewFor(platform: Platform, url: string | null): Preview {
  const yt = youtubeId(url);
  if (yt) {
    const vertical = /\/shorts\//.test(url ?? "");
    // Shorts têm thumbnail vertical (oardefault); vídeos comuns, a versão em alta (maxres). hqdefault sempre existe.
    const thumbCandidates = vertical
      ? [`https://i.ytimg.com/vi/${yt}/oardefault.jpg`, `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`]
      : [`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`];
    return {
      kind: "youtube",
      thumbUrl: thumbCandidates[0],
      thumbCandidates,
      embedUrl: `https://www.youtube.com/embed/${yt}?rel=0`,
      openUrl: url,
      vertical,
    };
  }
  const dv = driveId(url);
  if (dv) {
    const thumb = `https://drive.google.com/thumbnail?id=${dv}&sz=w1000`;
    return {
      kind: "drive",
      thumbUrl: thumb,
      thumbCandidates: [thumb],
      embedUrl: `https://drive.google.com/file/d/${dv}/preview`,
      // Sem link externo: a prévia fica no próprio dashboard, sem levar o usuário ao Drive.
      openUrl: null,
      vertical: false,
    };
  }
  if (url && /^https?:\/\//.test(url)) {
    return { kind: "image", thumbUrl: url, thumbCandidates: [url], embedUrl: null, openUrl: null, vertical: platform === "tiktok" };
  }
  return { kind: "none", thumbUrl: null, thumbCandidates: [], embedUrl: null, openUrl: null, vertical: platform === "tiktok" };
}

export interface CreativeGroup {
  id: string;
  platform: Platform;
  title: string;
  ad: string;
  adGroup: string;
  campaign: string;
  isMedx: boolean;
  url: string | null;
  rows: Row[];
}

/** Agrupa linhas por criativo, preservando a URL mais recente (thumbs do TikTok expiram). */
export function groupCreatives(rows: Row[]): CreativeGroup[] {
  const map = new Map<string, CreativeGroup>();
  const latestUrlDate = new Map<string, string>();
  for (const r of rows) {
    let g = map.get(r.creativeId);
    if (!g) {
      g = {
        id: r.creativeId,
        platform: r.platform,
        title: r.creativeTitle,
        ad: r.ad,
        adGroup: r.adGroup,
        campaign: r.campaign,
        isMedx: r.isMedx,
        url: null,
        rows: [],
      };
      map.set(r.creativeId, g);
    }
    g.rows.push(r);
    if (r.creativeUrl && r.date >= (latestUrlDate.get(r.creativeId) ?? "")) {
      g.url = r.creativeUrl;
      latestUrlDate.set(r.creativeId, r.date);
    }
  }
  return Array.from(map.values());
}
