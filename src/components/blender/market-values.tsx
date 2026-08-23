"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  formatPerGal,
  perBblFromGal,
  perGalFromBbl,
  type Blendstock,
  type ComponentSeekResult,
} from "@/lib/blend";
import { ActionButton } from "./action-button";
import { NumberField } from "./number-field";

export function MarketValues({
  regionLabel,
  components,
  seeks,
  busy = false,
  onPriceChange,
  onMustUseChange,
  onSeek,
}: {
  regionLabel: string;
  components: Blendstock[];
  seeks: Record<string, ComponentSeekResult>;
  busy?: boolean;
  onPriceChange: (id: string, costPerBbl: number) => void;
  onMustUseChange: (id: string, minLiftBbl: number) => void;
  onSeek: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{regionLabel} component book</CardTitle>
            <CardDescription>
              Every input is $/gal. Market is your bid or tank mark. Implied is the most the
              destination can pay and still beat buying the fungible / export barrel, after
              quality, RVO, and freight. If market ≤ implied, you can buy it to blend and ship.
            </CardDescription>
          </div>
          <ActionButton onClick={onSeek} busy={busy}>
            {busy ? "Seeking…" : "Value versus destination"}
          </ActionButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_5.75rem_5.75rem_5.75rem_4.5rem] gap-2 px-2.5 text-[10px] tracking-wide text-muted-foreground uppercase sm:grid">
          <span>Stream</span>
          <span className="text-right">Market $/gal</span>
          <span className="text-right">Implied $/gal</span>
          <span className="text-right">Must-use bbl</span>
          <span className="text-right">Bid</span>
        </div>
        {components.map((component) => {
          const seek = seeks[component.id];
          const marketGal = perGalFromBbl(component.costPerBbl);
          const impliedGal = seek?.impliedValue == null ? null : perGalFromBbl(seek.impliedValue);
          const locked = component.streamKey === "ethanol";
          const clears = !locked && impliedGal !== null && marketGal <= impliedGal + 0.004;
          return (
            <div
              key={component.id}
              className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border/80 px-2.5 py-2 sm:grid-cols-[minmax(0,1.4fr)_5.75rem_5.75rem_5.75rem_4.5rem]"
            >
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: component.color }} />
                  <p className="truncate font-medium">{component.name}</p>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {component.shortName} · {component.family}
                  {component.naphtha ? " · naphtha tank" : null}
                </p>
              </div>
              <label className="space-y-1">
                <Label className="text-[10px] text-muted-foreground sm:sr-only">Market $/gal</Label>
                <NumberField
                  aria-label={`${component.name} market dollars per gallon`}
                  value={marketGal}
                  digits={4}
                  step={0.0025}
                  min={0}
                  onChange={(value) => onPriceChange(component.id, perBblFromGal(value))}
                />
              </label>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground sm:sr-only">Implied $/gal</Label>
                <p className="flex h-8 items-center justify-end font-mono text-sm tabular-nums">
                  {locked ? "E10 lock" : formatPerGal(impliedGal)}
                </p>
              </div>
              <label className="space-y-1">
                <Label className="text-[10px] text-muted-foreground sm:sr-only">Must-use bbl</Label>
                <NumberField
                  aria-label={`${component.name} must-use barrels`}
                  value={component.minLiftBbl}
                  digits={0}
                  step={50}
                  min={0}
                  onChange={(value) => onMustUseChange(component.id, value)}
                />
              </label>
              <div className="flex h-8 items-center justify-end">
                {locked ? (
                  <Badge variant="outline">Splash</Badge>
                ) : seek == null ? (
                  <Badge variant="outline">Seek</Badge>
                ) : clears ? (
                  <Badge className="bg-emerald-500/15 text-emerald-800">Buy</Badge>
                ) : (
                  <Badge variant="destructive">Pass</Badge>
                )}
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-muted-foreground">
          Must-use is how you lock a naphtha tank you already own into the blend. Leave it at 0
          to treat the stream as a purchase you can take or leave.
        </p>
      </CardContent>
    </Card>
  );
}
