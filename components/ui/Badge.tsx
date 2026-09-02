import type { ReactNode } from "react";
import { PLATFORM_COLOR } from "@/lib/palette";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";

type Variant = "navy" | "gold" | "muted" | "outline";

export function Badge({ children, variant = "muted", className = "" }: { children: ReactNode; variant?: Variant; className?: string }) {
  const styles: Record<Variant, string> = {
    navy: "bg-navy text-white",
    gold: "bg-gold text-navy",
    muted: "bg-surface-3 text-ink-2",
    outline: "border border-line-strong text-ink-2",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${styles[variant]} ${className}`}>{children}</span>;
}

export function PlatformBadge({ platform, className = "" }: { platform: Platform; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-ink-2 ${className}`}>
      <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLOR[platform] }} aria-hidden />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}

export function SeriesKey({ color, label, kind = "line" }: { color: string; label: string; kind?: "line" | "rect" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
      {kind === "line" ? (
        <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: color }} aria-hidden />
      ) : (
        <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: color }} aria-hidden />
      )}
      {label}
    </span>
  );
}
