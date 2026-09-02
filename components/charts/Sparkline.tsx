import { ACCENT_COLOR, DEEMPHASIS_COLOR } from "@/lib/palette";

interface SparklineProps {
  values: (number | null)[];
  width?: number;
  height?: number;
}

/** Sparkline discreta: série em cinza de desênfase, último ponto no dourado da marca. */
export function Sparkline({ values, width = 64, height = 22 }: SparklineProps) {
  const pts = values.map((v, i) => ({ i, v })).filter((p): p is { i: number; v: number } => p.v !== null && Number.isFinite(p.v));
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke={DEEMPHASIS_COLOR} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.i)} cy={y(last.v)} r={2.5} fill={ACCENT_COLOR} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}
