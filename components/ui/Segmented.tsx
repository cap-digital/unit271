"use client";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  label: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({ value, onChange, options, label, size = "sm" }: SegmentedProps<T>) {
  const pad = size === "sm" ? "px-3 h-7 text-[12px]" : "px-3.5 h-8 text-[13px]";
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-0.5 rounded-full bg-surface-3 p-1">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={`rounded-full font-medium transition-colors ${pad} ${active ? "bg-surface text-navy shadow-sm" : "text-ink-2 hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
