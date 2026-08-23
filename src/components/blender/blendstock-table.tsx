"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatNumber, perBblFromGal, perGalFromBbl, type Blendstock } from "@/lib/blend";
import { Pencil } from "lucide-react";
import { NumberField } from "./number-field";

export function BlendstockTable({
  components,
  usedBbl,
  onComponentChange,
  onEdit,
}: {
  components: Blendstock[];
  usedBbl: Record<string, number>;
  onComponentChange: (id: string, patch: Partial<Blendstock>) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <>
    <div className="space-y-2 md:hidden">
      {components.map((component) => {
        const used = usedBbl[component.id] ?? 0;
        const left = component.inventoryBbl - used;
        return (
          <article key={component.id} className="space-y-3 rounded-xl border border-border/80 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: component.color }} />
                  <p className="font-medium">{component.name}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {component.shortName} · {component.family}
                  {component.naphtha ? ` · ${component.naphtha} naphtha` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  size="sm"
                  checked={component.enabled}
                  aria-label={`Use ${component.name}`}
                  onCheckedChange={(checked) => onComponentChange(component.id, { enabled: checked })}
                />
                <Button variant="ghost" size="icon" aria-label={`Edit ${component.name} assay`} onClick={() => onEdit(component.id)}>
                  <Pencil />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Inv bbl</span>
                <NumberField
                  aria-label={`${component.name} inventory barrels`}
                  value={component.inventoryBbl}
                  min={0}
                  step={10}
                  digits={0}
                  onChange={(value) =>
                    onComponentChange(component.id, { inventoryBbl: value, maxLiftBbl: Math.max(component.maxLiftBbl, value) })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Market $/gal</span>
                <NumberField
                  aria-label={`${component.name} market dollars per gallon`}
                  value={perGalFromBbl(component.costPerBbl)}
                  step={0.0025}
                  digits={4}
                  onChange={(value) => onComponentChange(component.id, { costPerBbl: perBblFromGal(value) })}
                />
              </label>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <MobileStat label="Used" value={formatNumber(used, 0)} />
              <MobileStat label="Left" value={formatNumber(left, 0)} />
              <MobileStat label="BON AKI" value={formatNumber((component.blendingRon + component.blendingMon) / 2, 1)} />
              <MobileStat label="RVP" value={formatNumber(component.rvp, 1)} />
              <MobileStat label="S ppm" value={formatNumber(component.sulfurPpm, 1)} />
              <MobileStat label="Bz" value={formatNumber(component.benzeneVolPct, 2)} />
              <MobileStat label="T50" value={formatNumber(component.t50F, 0)} />
              <MobileStat label="T90" value={formatNumber(component.t90F, 0)} />
            </dl>
          </article>
        );
      })}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[78rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-wide text-muted-foreground uppercase">
            <th className="pb-2 font-medium">Stream</th>
            <th className="pb-2 font-medium">Use</th>
            <th className="pb-2 text-right font-medium">Inv bbl</th>
            <th className="pb-2 text-right font-medium">Used</th>
            <th className="pb-2 text-right font-medium">Left</th>
            <th className="pb-2 text-right font-medium">Market $/gal</th>
            <th className="pb-2 text-right font-medium">BON AKI</th>
            <th className="pb-2 text-right font-medium">RVP</th>
            <th className="pb-2 text-right font-medium">S</th>
            <th className="pb-2 text-right font-medium">Bz</th>
            <th className="pb-2 text-right font-medium">T50</th>
            <th className="pb-2 text-right font-medium">T90</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {components.map((component) => {
            const used = usedBbl[component.id] ?? 0;
            const left = component.inventoryBbl - used;
            return (
              <tr key={component.id} className="border-t border-border/70">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: component.color }} />
                    <div>
                      <div className="font-medium">
                        {component.name}
                        {component.naphtha ? (
                          <span className="ml-2 text-[11px] font-normal text-amber-800">
                            {component.naphtha} naphtha
                          </span>
                        ) : null}
                      </div>
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
                    onCheckedChange={(checked) => onComponentChange(component.id, { enabled: checked })}
                  />
                </td>
                <td className="py-2 pl-2">
                  <NumberField
                    aria-label={`${component.name} inventory barrels`}
                    className="ml-auto w-20"
                    value={component.inventoryBbl}
                    min={0}
                    step={10}
                    digits={0}
                    onChange={(value) =>
                      onComponentChange(component.id, { inventoryBbl: value, maxLiftBbl: Math.max(component.maxLiftBbl, value) })
                    }
                  />
                </td>
                <td className="py-2 text-right font-mono tabular-nums">{formatNumber(used, 0)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatNumber(left, 0)}</td>
                <td className="py-2 pl-2">
                  <NumberField
                    aria-label={`${component.name} market dollars per gallon`}
                    className="ml-auto w-16"
                    value={perGalFromBbl(component.costPerBbl)}
                    step={0.0025}
                    digits={4}
                    onChange={(value) => onComponentChange(component.id, { costPerBbl: perBblFromGal(value) })}
                  />
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {formatNumber((component.blendingRon + component.blendingMon) / 2, 1)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">{formatNumber(component.rvp, 1)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatNumber(component.sulfurPpm, 1)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatNumber(component.benzeneVolPct, 2)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatNumber(component.t50F, 0)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatNumber(component.t90F, 0)}</td>
                <td className="py-2 pl-2">
                  <Button variant="ghost" size="icon-xs" aria-label={`Edit ${component.name} assay`} onClick={() => onEdit(component.id)}>
                    <Pencil />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-1.5">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
