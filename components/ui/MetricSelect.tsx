"use client";

import { ChevronDown } from "lucide-react";
import type { MetricDef, MetricKey } from "@/lib/metrics";

interface MetricSelectProps {
  value: MetricKey;
  onChange: (key: MetricKey) => void;
  options: MetricDef[];
  label?: string;
  id?: string;
}

export function MetricSelect({ value, onChange, options, label = "Métrica", id }: MetricSelectProps) {
  const sums = options.filter((m) => m.kind === "sum");
  const ratios = options.filter((m) => m.kind === "ratio");
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as MetricKey)}
        className="h-9 cursor-pointer appearance-none rounded-full border border-line bg-surface-2 pl-3 pr-8 text-[13px] font-medium text-ink hover:bg-surface-3"
      >
        {sums.length > 0 && (
          <optgroup label="Volumes">
            {sums.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </optgroup>
        )}
        {ratios.length > 0 && (
          <optgroup label="Custos e taxas">
            {ratios.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" aria-hidden />
    </label>
  );
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  label: string;
}

export function SimpleSelect<T extends string>({ value, onChange, options, label }: SelectProps<T>) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 max-w-[260px] cursor-pointer appearance-none truncate rounded-full border border-line bg-surface-2 pl-3 pr-8 text-[13px] font-medium text-ink hover:bg-surface-3"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" aria-hidden />
    </label>
  );
}
