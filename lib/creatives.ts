import { creativeFallbackUrl } from "./creativeOverrides";
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

/**
 * Prévia do criativo. `fallbackUrl` (link informado manualmente) entra como
 * reserva: as thumbnails dele vão para o fim da fila e o vídeo embutível dele
 * é usado quando a URL da extração não oferece um.
 */
export function previewFor(platform: Platform, url: string | null, fallbackUrl: string | null = null): Preview {
  const primary = basePreview(platform, url);
  if (!fallbackUrl || fallbackUrl === url) return primary;
  const fallback = basePreview(platform, fallbackUrl);
  const thumbCandidates = Array.from(new Set([...primary.thumbCandidates, ...fallback.thumbCandidates]));
  return {
    kind: primary.kind !== "none" ? primary.kind : fallback.kind,
    thumbUrl: thumbCandidates[0] ?? null,
    thumbCandidates,
    embedUrl: primary.embedUrl ?? fallback.embedUrl,
    openUrl: primary.openUrl ?? fallback.openUrl,
    vertical: primary.vertical || fallback.vertical,
  };
}

function basePreview(platform: Platform, url: string | null): Preview {
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
      vertical: platform === "tiktok",
    };
  }
  // Imagem da própria aplicação (public/) ou URL externa.
  if (url && (/^https?:\/\//.test(url) || url.startsWith("/"))) {
    return { kind: "image", thumbUrl: url, thumbCandidates: [url], embedUrl: null, openUrl: null, vertical: platform === "tiktok" };
  }
  return { kind: "none", thumbUrl: null, thumbCandidates: [], embedUrl: null, openUrl: null, vertical: platform === "tiktok" };
}

export interface CreativeGroup {
  id: string;
  platform: Platform;
  /** Nome exibido: o do anúncio, acrescido do conjunto quando o mesmo nome roda em mais de um. */
  title: string;
  ad: string;
  /** Campanha e/ou conjunto que diferenciam este criativo de outro com o mesmo nome (null quando o nome é único). */
  segment: string | null;
  /** Primeiro grupo de anúncios encontrado (compatibilidade). */
  adGroup: string;
  /** Todos os grupos em que o anúncio rodou — o mesmo criativo pode estar em vários. */
  adGroups: string[];
  campaign: string;
  isMedx: boolean;
  url: string | null;
  /** Link de prévia informado manualmente, usado quando a extração não traz (ou a URL expira). */
  fallbackUrl: string | null;
  rows: Row[];
}

/** Agrupa linhas por criativo, preservando a URL mais recente (thumbs do TikTok expiram). */
export function groupCreatives(rows: Row[]): CreativeGroup[] {
  const map = new Map<string, CreativeGroup>();
  const latestUrlDate = new Map<string, string>();
  const groupsSeen = new Map<string, Set<string>>();
  for (const r of rows) {
    let g = map.get(r.creativeId);
    if (!g) {
      g = {
        id: r.creativeId,
        platform: r.platform,
        title: r.creativeTitle,
        ad: r.ad,
        segment: null,
        adGroup: r.adGroup,
        adGroups: [],
        campaign: r.campaign,
        isMedx: r.isMedx,
        url: null,
        fallbackUrl: creativeFallbackUrl(r.platform, r.ad, r.isMedx),
        rows: [],
      };
      map.set(r.creativeId, g);
      groupsSeen.set(r.creativeId, new Set());
    }
    g.rows.push(r);
    if (r.adGroup) groupsSeen.get(r.creativeId)!.add(r.adGroup);
    if (r.creativeUrl && r.date >= (latestUrlDate.get(r.creativeId) ?? "")) {
      g.url = r.creativeUrl;
      latestUrlDate.set(r.creativeId, r.date);
    }
  }
  for (const g of map.values()) g.adGroups = Array.from(groupsSeen.get(g.id) ?? []);
  const groups = Array.from(map.values());
  disambiguate(groups);
  return groups;
}

/** "[TIKTOK] MEDX [PI 45122]" → ["TIKTOK", "MEDX", "PI 45122"]: trechos entre colchetes e palavras soltas. */
function nameTokens(name: string): string[] {
  return (name.match(/\[[^\]]*\]|[^\s[\]]+/g) ?? []).map((t) => t.replace(/^\[|\]$/g, "").trim()).filter(Boolean);
}

/**
 * Para cada nome, os trechos que não se repetem em todos os outros — o que de
 * fato diferencia um do outro. Ex.: campanhas "[TIKTOK] MEDX [PI…]" e
 * "[TIKTOK] [PI…]" → "MEDX" e "". Nomes iguais devolvem "".
 */
function distinctiveParts(names: string[]): string[] {
  const tokens = names.map(nameTokens);
  const common = tokens.reduce((acc, t) => acc.filter((x) => t.includes(x)));
  return tokens.map((t) => t.filter((x) => !common.includes(x)).join(" "));
}

/**
 * O mesmo nome de anúncio pode rodar em campanhas ou conjuntos diferentes
 * (ex.: YouTube em [INT. MEDICINA…] e [OPEN]). Cada combinação é um criativo à
 * parte; aqui o título ganha o que os diferencia para que cards, tabelas e
 * gráficos não repitam nomes.
 */
function disambiguate(groups: CreativeGroup[]): void {
  const byName = new Map<string, CreativeGroup[]>();
  for (const g of groups) {
    const key = `${g.platform}|${g.title}`;
    byName.set(key, [...(byName.get(key) ?? []), g]);
  }
  for (const same of byName.values()) {
    if (same.length < 2) continue;
    const campaigns = distinctiveParts(same.map((g) => g.campaign));
    const adGroups = distinctiveParts(same.map((g) => g.adGroup));
    same.forEach((g, i) => {
      // a campanha sem trecho próprio é a regular (ex.: a 27.1 frente à MEDX)
      const campaign = campaigns.some(Boolean) ? campaigns[i] || (g.isMedx ? "MEDX" : "27.1") : "";
      g.segment = [campaign, adGroups[i]].filter(Boolean).join(" · ") || g.adGroup || g.campaign;
      g.title = `${g.title} · ${g.segment}`;
    });
  }
}
