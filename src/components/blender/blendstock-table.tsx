"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Blendstock, Recipe } from "@/lib/blend";
import { formatNumber } from "@/lib/blend";
import { Pencil } from "lucide-react";
import { NumberField } from "./number-field";

export function BlendstockTable({
  components,
  recipe,
  onVolumeChange,
  onComponentChange,
  onEdit,
}: {
  components: Blendstock[];
  recipe: Recipe;
  onVolumeChange: (id: string, volPct: number) => void;
  onComponentChange: (id: string, patch: Partial<Blendstock>) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[72rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-wide text-muted-foreground uppercase">
            <th className="pb-2 font-medium">Stream</th>
            <th className="pb-2 font-medium">Use</th>
            <th className="pb-2 text-right font-medium">Vol%</th>
            <th className="pb-2 text-right font-medium">Min</th>
            <th className="pb-2 text-right font-medium">Max</th>
            <th className="pb-2 text-right font-medium">$/bbl</th>
            <th className="pb-2 text-right font-medium">RON</th>
            <th className="pb-2 text-right font-medium">MON</th>
            <th className="pb-2 text-right font-medium">RVP</th>
            <th className="pb-2 text-right font-medium">S ppm</th>
            <th className="pb-2 text-right font-medium">Bz %</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {components.map((component) => {
            const volPct = (recipe.volumes[component.id] ?? 0) * 100;
            return (
              <tr key={component.id} className="border-t border-border/70">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: component.color }}
                    />
                    <div>
                      <div className="font-medium">{component.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {component.shortName} · {component.family}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <Switch
                    size="sm"
                    checked={component.enabled}
                    aria-label={`Use ${component.name}`}
                    onCheckedChange={(checked) =>
                      onComponentChange(component.id, { enabled: checked })
                    }
                  />
                </td>
                <td className="py-2 pl-2">
                  <NumberField
                    aria-label={`${component.name} volume percent`}
                    className="ml-auto w-16"
                    value={volPct}
                    min={0}
                    max={100}
                    step={0.1}
                    digits={1}
                    disabled={!component.enabled}
                    onChange={(value) => onVolumeChange(component.id, value)}
                  />
                </td>
                <td className="py-2 pl-2">
                  <NumberField
                    aria-label={`${component.name} minimum volume percent`}
                    className="ml-auto w-14"
                    value={component.minVolPct}
                    min={0}
                    max={component.maxVolPct}
                    step={0.5}
                    digits={1}
                    onChange={(value) => onComponentChange(component.id, { minVolPct: value })}
                  />
                </td>
                <td className="py-2 pl-2">
                  <NumberField
                    aria-label={`${component.name} maximum volume percent`}
                    className="ml-auto w-14"
                    value={component.maxVolPct}
                    min={component.minVolPct}
                    max={100}
                    step={0.5}
                    digits={1}
                    onChange={(value) => onComponentChange(component.id, { maxVolPct: value })}
                  />
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatNumber(component.costPerBbl, 2)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatNumber(component.ron, 1)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatNumber(component.mon, 1)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatNumber(component.rvp, 1)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatNumber(component.sulfurPpm, 1)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatNumber(component.benzeneVolPct, 2)}
                </td>
                <td className="py-2 pl-2">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Edit ${component.name} assay`}
                    onClick={() => onEdit(component.id)}
                  >
                    <Pencil />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
