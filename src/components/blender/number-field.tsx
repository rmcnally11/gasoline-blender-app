"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NumberFieldProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  digits?: number;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 0.1,
  digits = 2,
  className,
  disabled,
  "aria-label": ariaLabel,
}: NumberFieldProps) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "h-7 px-1.5 text-right font-mono text-xs tabular-nums md:text-xs",
        className,
      )}
      value={Number.isFinite(value) ? Number(value.toFixed(digits)) : 0}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isNaN(next)) return;
        let clamped = next;
        if (min !== undefined) clamped = Math.max(min, clamped);
        if (max !== undefined) clamped = Math.min(max, clamped);
        onChange(clamped);
      }}
    />
  );
}
