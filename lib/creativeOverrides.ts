import type { Platform } from "./types";

type Campaign = "medx" | "regular";

/**
 * URLs de prévia informadas manualmente para criativos que a extração entrega
 * sem link. No TikTok, os anúncios abaixo chegam sem "Video Thumbnail URL" em
 * todas as linhas; sem este mapa ficariam sem prévia no dashboard.
 *
 * O mapa é separado por campanha (MEDX ou 27.1): o mesmo nome de anúncio em
 * outra campanha é outro criativo e não herda a prévia.
 *
 * Quando a extração traz a URL, ela continua sendo a primeira opção — o link
 * daqui entra como reserva (inclusive quando a thumbnail assinada do TikTok expira).
 * Para incluir um criativo novo, basta acrescentar o nome do anúncio e o link
 * (Drive, URL externa ou caminho de uma imagem em public/) na campanha certa.
 */
const OVERRIDES: Partial<Record<Platform, Partial<Record<Campaign, Record<string, string>>>>> = {
  tiktok: {
    regular: {
      // Sem link do Drive: imagens enviadas pelo time, servidas de public/creatives.
      "[AD] 01": "/creatives/tiktok-ad-01.png",
      "[AD] 02": "/creatives/tiktok-ad-02.png",
      "[AD] 03 - ULTIMA SEMANA": "/creatives/tiktok-ad-03-ultima-semana.png",
      "[AD] 05": "/creatives/tiktok-ad-05.png",
      "[AD] 06": "/creatives/tiktok-ad-06.png",
      "[AD] 07": "/creatives/tiktok-ad-07.png",
      "[AD] 08": "/creatives/tiktok-ad-08.png",
      "[AD] 09": "/creatives/tiktok-ad-09.png",
    },
    medx: {
      "[AD] DIGENAL 1": "https://drive.google.com/file/d/1e-YvWOdWKIsHvS9FxbLq9m4xWUF0lkh0/view?usp=sharing",
      "[AD] DIGENAL 2": "https://drive.google.com/file/d/1v-L9d-QuN7Dp8yKW1dTKJkJjAs9m895p/view?usp=sharing",
      "[AD] DIGENAL 3 - 04.09": "https://drive.google.com/file/d/1Tqezir3VU_4XNni7_XpxD7IL2Jk61xQV/view?usp=sharing",
      "[AD] DIGENAL 4 - 04.09": "https://drive.google.com/file/d/1xfNq8Nrofv5IOJNjedM906Ag63dro905/view?usp=sharing",
      "[AD] PROFESSOR 1 - 04.09": "https://drive.google.com/file/d/1hDAh5dhDqhswHIYBtXDyURvoUws3_v3d/view?usp=sharing",
      "[AD] PROFESSOR 2 - 04.09": "https://drive.google.com/file/d/1xkfKSVcg5ZuIi-Qv_brsWLD4Kk4cwx-p/view?usp=sharing",
      "[AD] PROFESSOR 3 - 04.09": "https://drive.google.com/file/d/1aeOHftpCkffn3orKUQqVoCxmuS5VV8TN/view?usp=sharing",
      "[AD] PROFESSOR 4 - 04.09": "https://drive.google.com/file/d/1ncAKEDK68u_dFFgd1eFmUS12GdgqOpoa/view?usp=sharing",
    },
  },
};

/** Compara nomes sem depender de caixa, espaços extras ou tipo de travessão. */
function normalizeAdName(name: string): string {
  return name.trim().replace(/[‒-―]/g, "-").replace(/\s+/g, " ").toUpperCase();
}

const INDEX = new Map<string, string>(
  Object.entries(OVERRIDES).flatMap(([platform, byCampaign]) =>
    Object.entries(byCampaign ?? {}).flatMap(([campaign, byName]) =>
      Object.entries(byName ?? {}).map(([name, url]) => [`${platform}|${campaign}|${normalizeAdName(name)}`, url] as const),
    ),
  ),
);

/** Link de prévia de reserva para o anúncio na sua campanha, ou null quando não há. */
export function creativeFallbackUrl(platform: Platform, adName: string, isMedx: boolean): string | null {
  const campaign: Campaign = isMedx ? "medx" : "regular";
  return INDEX.get(`${platform}|${campaign}|${normalizeAdName(adName)}`) ?? null;
}
