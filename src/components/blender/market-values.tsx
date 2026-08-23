"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  centsPerGalToDollarsPerBbl,
  dollarsPerBblToCentsPerGal,
  type Blendstock,
} from "@/lib/blend";
import { NumberField } from "./number-field";

export function MarketValues({
  regionLabel,
  components,
  onPriceChange,
}: {
  regionLabel: string;
  components: Blendstock[];
  onPriceChange: (id: string, costPerBbl: number) => void;
}) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>{regionLabel} market values</CardTitle>
        <CardDescription>
          Type today&apos;s transfer or posted price for each stream. The header uses these as the
          cost of lifting barrels. Assay stays on the pencil; this card is price only. Isooctane
          is purchased 100 AKI; alkylate is the refinery stream.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {components.map((component) => (
            <div
              key={component.id}
              className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-end gap-2 rounded-lg border border-border/80 px-2.5 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: component.color }} />
                  <p className="truncate font-medium">{component.name}</p>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {component.shortName} · {component.family}
                </p>
              </div>
              <label className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">$/bbl</Label>
                <NumberField
                  aria-label={`${component.name} market dollars per barrel`}
                  value={component.costPerBbl}
                  digits={2}
                  step={0.5}
                  min={0}
                  onChange={(value) => onPriceChange(component.id, value)}
                />
              </label>
              <label className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">¢/gal</Label>
                <NumberField
                  aria-label={`${component.name} market cents per gallon`}
                  value={dollarsPerBblToCentsPerGal(component.costPerBbl)}
                  digits={2}
                  step={0.5}
                  min={0}
                  onChange={(value) => onPriceChange(component.id, centsPerGalToDollarsPerBbl(value))}
                />
              </label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
