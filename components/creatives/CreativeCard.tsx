"use client";

/* eslint-disable @next/next/no-img-element */
import { ExternalLink, ImageOff, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { previewFor, type CreativeGroup } from "@/lib/creatives";
import { fmtValue } from "@/lib/format";
import { METRICS, metricValue, type MetricKey, type Totals } from "@/lib/metrics";
import { Badge, PlatformBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

export const CREATIVE_METRICS: Record<CreativeGroup["platform"], MetricKey[]> = {
  google: ["investment", "impressions", "clicks", "ctr", "cpc", "cpm"],
  youtube: ["investment", "impressions", "views", "vtr", "cpv", "completion"],
  tiktok: ["investment", "impressions", "views", "vtr", "cpm", "completion"],
};

interface ThumbProps {
  group: CreativeGroup;
  className?: string;
  onClick?: () => void;
}

/** Thumbnail com fallback em cadeia (Shorts → hqdefault) e placeholder quando a URL expira (TikTok assina as imagens por poucas horas). */
export function CreativeThumb({ group, className = "", onClick }: ThumbProps) {
  const preview = previewFor(group.platform, group.url);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [preview.thumbUrl]);
  const src = preview.thumbCandidates[attempt] ?? null;
  const playable = preview.kind === "youtube" || preview.kind === "drive";
  const fit = preview.vertical ? "object-cover" : "object-contain bg-navy-soft";
  const content =
    src ? (
      <img key={src} src={src} alt={group.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setAttempt((a) => a + 1)} className={`h-full w-full ${fit}`} />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-navy-soft text-navy">
        <ImageOff className="h-5 w-5" aria-hidden />
        <span className="text-[10px] font-medium">Prévia indisponível</span>
      </div>
    );
  return (
    <button type="button" onClick={onClick} className={`group relative block overflow-hidden bg-surface-3 ${className}`} aria-label={`Abrir prévia: ${group.title}`}>
      {content}
      {playable && (
        <span className="absolute inset-0 flex items-center justify-center bg-navy/0 transition-colors group-hover:bg-navy/20">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-navy shadow-float">
            <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden />
          </span>
        </span>
      )}
    </button>
  );
}

interface CreativeCardProps {
  group: CreativeGroup;
  totals: Totals;
  /** Métrica em destaque (ordenação da página). */
  highlight?: MetricKey;
  onOpen: () => void;
}

export function CreativeCard({ group, totals, highlight, onOpen }: CreativeCardProps) {
  const keys = CREATIVE_METRICS[group.platform];
  // o título já é o nome do anúncio: não repete a informação na linha de apoio
  const subtitle = [group.title === group.ad ? null : group.ad, ...group.adGroups].filter(Boolean).join(" · ");
  const ordered = highlight && !keys.includes(highlight) ? [highlight, ...keys.slice(0, 5)] : keys;
  return (
    <article className="fade-in flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <CreativeThumb group={group} onClick={onOpen} className="aspect-[4/5] w-full" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={group.platform} />
          {group.isMedx && <Badge variant="gold">MEDX</Badge>}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink" title={group.title}>
            {group.title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-muted" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-x-2 gap-y-2">
          {ordered.map((k) => {
            const def = METRICS[k];
            const v = metricValue(k, totals);
            const hl = k === highlight;
            return (
              <div key={k} className={`rounded-xl px-2 py-1.5 ${hl ? "bg-gold-soft" : "bg-surface-2"}`}>
                <dt className="text-[10px] font-medium text-muted">{def.short}</dt>
                <dd className="tnum text-[13px] font-semibold text-ink">{fmtValue(v, def.format, { compact: true })}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </article>
  );
}

export function CreativePreviewModal({ group, totals, onClose }: { group: CreativeGroup | null; totals: Totals | null; onClose: () => void }) {
  if (!group || !totals) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const preview = previewFor(group.platform, group.url);
  const keys = CREATIVE_METRICS[group.platform];
  const frameClass = preview.vertical ? "mx-auto aspect-[9/16] max-h-[60vh]" : "aspect-video w-full";
  return (
    <Modal open onClose={onClose} size={preview.vertical ? "md" : "lg"} title={group.title}>
      <div className="space-y-4">
        <div className={`overflow-hidden rounded-2xl bg-navy ${frameClass}`}>
          {preview.embedUrl ? (
            <iframe src={preview.embedUrl} title={group.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : preview.thumbUrl ? (
            <CreativeThumb group={group} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-white/80">Prévia indisponível para este criativo.</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge platform={group.platform} />
          {group.isMedx && <Badge variant="gold">MEDX</Badge>}
          {group.title !== group.ad && <Badge variant="outline">{group.ad}</Badge>}
          {preview.openUrl && (
            <a href={preview.openUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-navy hover:underline">
              Abrir original <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
        <p className="text-[11px] text-muted">{[group.campaign, ...group.adGroups].filter(Boolean).join(" · ")}</p>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {keys.map((k) => {
            const def = METRICS[k];
            return (
              <div key={k} className="rounded-xl bg-surface-2 px-3 py-2">
                <dt className="text-[10px] font-medium text-muted">{def.label}</dt>
                <dd className="tnum text-[14px] font-semibold text-ink">{fmtValue(metricValue(k, totals), def.format)}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </Modal>
  );
}
