import { CHART_CHROME } from "@/lib/palette";

/** Props que o recharts passa para o `content` de um LabelList. */
interface RechartsLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string | null;
  index?: number;
}

interface LabelOptions {
  format: (v: number) => string;
  /** Exibe 1 rótulo a cada N pontos (evita amontoar em períodos longos). */
  step?: number;
  /** Deslocamento vertical: negativo sobe, positivo desce. */
  dy?: number;
  tone?: "ink" | "muted";
  /** Total de pontos: ancora os rótulos das pontas para dentro do gráfico. */
  count?: number;
  /** Deslocamento por ponto (null oculta o rótulo); tem prioridade sobre `dy`. */
  dyAt?: (index: number) => number | null;
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Texto do rótulo com contorno na cor da superfície: continua legível quando
 * passa por cima de uma linha, de um preenchimento ou da grade.
 */
function LabelText({ x, y, text, tone, anchor = "middle" }: { x: number; y: number; text: string; tone: "ink" | "muted"; anchor?: "start" | "middle" | "end" }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={11}
      fontWeight={600}
      fill={tone === "ink" ? CHART_CHROME.ink : CHART_CHROME.muted}
      stroke={CHART_CHROME.surface}
      strokeWidth={3}
      paintOrder="stroke"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {text}
    </text>
  );
}

/** Rótulo para pontos de linha/área. */
export function makePointLabel({ format, step = 1, dy = -10, tone = "ink", count, dyAt }: LabelOptions) {
  const PointLabel = (props: RechartsLabelProps) => {
    const value = toNumber(props.value);
    if (value === null) return null;
    const index = props.index ?? 0;
    if (step > 1 && index % step !== 0) return null;
    const offset = dyAt ? dyAt(index) : dy;
    if (offset === null) return null;
    const x = toNumber(props.x);
    const y = toNumber(props.y);
    if (x === null || y === null) return null;
    // nas pontas o texto é ancorado para dentro, senão sai da área do gráfico
    const last = count !== undefined && index === count - 1;
    const anchor = last ? "end" : index === 0 ? "start" : "middle";
    const dx = last ? 4 : index === 0 ? -4 : 0;
    return <LabelText x={x + dx} y={y + offset} text={format(value)} tone={tone} anchor={anchor} />;
  };
  return PointLabel;
}

/** Rótulo no topo da barra (ignora zeros para não poluir barras vazias). */
export function makeBarLabel({ format, dy = -6, tone = "ink" }: Omit<LabelOptions, "step">) {
  const BarLabel = (props: RechartsLabelProps) => {
    const value = toNumber(props.value);
    if (value === null || value === 0) return null;
    const text = format(value);
    // valores que arredondam para zero na escala do eixo (ex.: "0k") não ganham rótulo:
    // a barra é invisível e o número passaria a impressão errada
    if (!/[1-9]/.test(text)) return null;
    const x = toNumber(props.x);
    const y = toNumber(props.y);
    const width = toNumber(props.width) ?? 0;
    if (x === null || y === null) return null;
    return <LabelText x={x + width / 2} y={y + dy} text={text} tone={tone} />;
  };
  return BarLabel;
}
