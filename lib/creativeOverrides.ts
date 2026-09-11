import type { Platform } from "./types";

/**
 * URLs de prévia informadas manualmente para criativos que a extração entrega
 * sem link. No TikTok, os anúncios abaixo chegam sem "Video Thumbnail URL" em
 * todas as linhas; sem este mapa ficariam sem prévia no dashboard.
 *
 * Quando a extração traz a URL, ela continua sendo a primeira opção — o link
 * daqui entra como reserva (inclusive quando a thumbnail assinada do TikTok expira).
 * Para incluir um criativo novo, basta acrescentar o nome do anúncio e o link.
 */
const OVERRIDES: Partial<Record<Platform, Record<string, string>>> = {
  tiktok: {
    "[AD] DIGENAL 1": "https://drive.google.com/file/d/1e-YvWOdWKIsHvS9FxbLq9m4xWUF0lkh0/view?usp=sharing",
    "[AD] DIGENAL 2": "https://drive.google.com/file/d/1v-L9d-QuN7Dp8yKW1dTKJkJjAs9m895p/view?usp=sharing",
    "[AD] DIGENAL 3 - 04.09": "https://drive.google.com/file/d/1Tqezir3VU_4XNni7_XpxD7IL2Jk61xQV/view?usp=sharing",
    "[AD] DIGENAL 4 - 04.09": "https://drive.google.com/file/d/1xfNq8Nrofv5IOJNjedM906Ag63dro905/view?usp=sharing",
    "[AD] PROFESSOR 1 - 04.09": "https://drive.google.com/file/d/1hDAh5dhDqhswHIYBtXDyURvoUws3_v3d/view?usp=sharing",
    "[AD] PROFESSOR 2 - 04.09": "https://drive.google.com/file/d/1xkfKSVcg5ZuIi-Qv_brsWLD4Kk4cwx-p/view?usp=sharing",
    "[AD] PROFESSOR 3 - 04.09": "https://drive.google.com/file/d/1aeOHftpCkffn3orKUQqVoCxmuS5VV8TN/view?usp=sharing",
    "[AD] PROFESSOR 4 - 04.09": "https://drive.google.com/file/d/1ncAKEDK68u_dFFgd1eFmUS12GdgqOpoa/view?usp=sharing",
  },
};

/** Compara nomes sem depender de caixa, espaços extras ou tipo de travessão. */
function normalizeAdName(name: string): string {
  return name.trim().replace(/[‒-―]/g, "-").replace(/\s+/g, " ").toUpperCase();
}

const INDEX: Partial<Record<Platform, Map<string, string>>> = Object.fromEntries(
  Object.entries(OVERRIDES).map(([platform, byName]) => [
    platform,
    new Map(Object.entries(byName ?? {}).map(([name, url]) => [normalizeAdName(name), url])),
  ]),
);

/** Link de prévia de reserva para o anúncio, ou null quando não há. */
export function creativeFallbackUrl(platform: Platform, adName: string): string | null {
  return INDEX[platform]?.get(normalizeAdName(adName)) ?? null;
}
