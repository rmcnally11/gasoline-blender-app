"use client";

import { useEffect, useState } from "react";
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
  const [draft, setDraft] = useState(() => formatDraft(value, digits));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatDraft(value, digits));
  }, [value, digits, focused]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "h-11 px-2 text-right font-mono text-base tabular-nums md:h-8 md:text-sm",
        className,
      )}
      value={draft}
      onFocus={() => {
        setFocused(true);
        setDraft(formatDraft(value, digits));
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseDraft(draft);
        if (parsed === null) {
          setDraft(formatDraft(value, digits));
          return;
        }
        const next = clamp(parsed, min, max);
        onChange(next);
        setDraft(formatDraft(next, digits));
      }}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        const parsed = parseDraft(nextDraft);
        if (parsed === null) return;
        onChange(clamp(parsed, min, max));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          (event.target as HTMLInputElement).blur();
        }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const parsed = parseDraft(draft) ?? value;
          const delta = event.key === "ArrowUp" ? step : -step;
          const next = clamp(parsed + delta, min, max);
          onChange(next);
          setDraft(formatDraft(next, digits));
        }
      }}
    />
  );
}

function formatDraft(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(digits);
}

function parseDraft(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min?: number, max?: number): number {
  let next = value;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}
