"use client";

import type { Blendstock, Recipe } from "@/lib/blend";
import { formatPct } from "@/lib/blend";
import { volumeFractions } from "@/lib/blend/properties";

export function RecipeBar({
  components,
  recipe,
}: {
  components: Blendstock[];
  recipe: Recipe;
}) {
  const { fractions, total } = volumeFractions(components, recipe);
  const used = components.filter((component) => (fractions[component.id] ?? 0) > 0.0005);

  if (total <= 1e-12 || used.length === 0) {
    return (
      <div className="flex h-10 items-center rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground">
        No recipe yet. Solve the blend or type volume percents in the pool.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex h-10 overflow-hidden rounded-lg bg-muted/60 ring-1 ring-foreground/10">
        {used.map((component) => {
          const fraction = fractions[component.id] ?? 0;
          return (
            <div
              key={component.id}
              title={`${component.name} ${formatPct(fraction * 100)}`}
              className="h-full min-w-0"
              style={{ width: `${fraction * 100}%`, backgroundColor: component.color }}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {used.map((component) => (
          <li key={component.id} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: component.color }} />
            <span className="text-foreground">{component.shortName}</span>
            <span className="font-mono tabular-nums">{formatPct(fractions[component.id] * 100)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
