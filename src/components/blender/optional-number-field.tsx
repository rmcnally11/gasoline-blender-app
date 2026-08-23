"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function OptionalNumberField({
  value,
  onChange,
  digits = 2,
  step = 0.25,
  className,
  "aria-label": ariaLabel,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  digits?: number;
  step?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = useState(() => formatOptional(value, digits));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatOptional(value, digits));
  }, [value, digits, focused]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder="—"
      className={cn("h-8 px-2 text-right font-mono text-sm tabular-nums md:text-sm", className)}
      value={draft}
      onFocus={() => {
        setFocused(true);
        setDraft(formatOptional(value, digits));
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseOptional(draft);
        onChange(parsed);
        setDraft(formatOptional(parsed, digits));
      }}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const parsed = parseOptional(draft) ?? 0;
          const next = parsed + (event.key === "ArrowUp" ? step : -step);
          onChange(next);
          setDraft(formatOptional(next, digits));
        }
      }}
    />
  );
}

function formatOptional(value: number | null, digits: number): string {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toFixed(digits);
}

function parseOptional(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
