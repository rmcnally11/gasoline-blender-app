"use client";

import Link from "next/link";
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
  seeks = {},
  busy = false,
  editPrices = true,
  onPriceChange,
  onMustUseChange,
  onSeek,
}: {
  regionLabel: string;
  components: Blendstock[];
  seeks: Record<string, ComponentSeekResult>;
  busy?: boolean;
  editPrices?: boolean;
  onPriceChange?: (id: string, costPerBbl: number) => void;
  onMustUseChange?: (id: string, minLiftBbl: number) => void;
  onSeek: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>
              {editPrices ? `${regionLabel} component book` : `${regionLabel} implied vs your book`}
            </CardTitle>
            <CardDescription>
              {editPrices ? (
                <>
                  Every input is $/gal. Implied is the plant LP indifference price — the same dual
                  the header uses. If a quality debit card is shown, it is a heuristic, not the bid.
                </>
              ) : (
                <>
                  Prices come from{" "}
                  <Link href="/inputs" className="text-sky-800 underline underline-offset-2">
                    Inputs
                  </Link>
                  . Implied is the plant LP indifference price — the same dual the P&L uses.
                </>
              )}
            </CardDescription>
          </div>
          <ActionButton className="w-full md:w-auto" onClick={onSeek} busy={busy}>
            {busy ? "Seeking…" : "Value versus destination"}
          </ActionButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          className={`hidden gap-2 px-2.5 text-[10px] tracking-wide text-muted-foreground uppercase md:grid ${
            editPrices
              ? "grid-cols-[minmax(0,1.4fr)_5.75rem_5.75rem_5.75rem_4.5rem]"
              : "grid-cols-[minmax(0,1.4fr)_5.75rem_5.75rem_4.5rem]"
          }`}
        >
          <span>Stream</span>
          {editPrices ? <span className="text-right">Market $/gal</span> : null}
          <span className="text-right">Implied $/gal</span>
          {editPrices ? <span className="text-right">Must-use bbl</span> : <span className="text-right">Your $/gal</span>}
          <span className="text-right">Bid</span>
        </div>
        {components.map((component) => {
          const seek = seeks?.[component.id];
          const marketGal = perGalFromBbl(component.costPerBbl);
          const impliedGal = seek?.impliedValue == null ? null : perGalFromBbl(seek.impliedValue);
          const locked = component.streamKey === "ethanol";
          const clears = !locked && impliedGal !== null && marketGal <= impliedGal + 0.004;
          return (
            <div
              key={component.id}
              className={`grid grid-cols-2 items-end gap-2 rounded-lg border border-border/80 px-2.5 py-2 ${
                editPrices
                  ? "md:grid-cols-[minmax(0,1.4fr)_5.75rem_5.75rem_5.75rem_4.5rem]"
                  : "md:grid-cols-[minmax(0,1.4fr)_5.75rem_5.75rem_4.5rem]"
              }`}
            >
              <div className="col-span-2 min-w-0 md:col-span-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: component.color }} />
                  <p className="truncate font-medium">{component.name}</p>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {component.shortName} · {component.family}
                  {component.naphtha ? " · naphtha tank" : null}
                </p>
              </div>
              {editPrices ? (
                <label className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground md:sr-only">Market $/gal</Label>
                  <NumberField
                    aria-label={`${component.name} market dollars per gallon`}
                    value={marketGal}
                    digits={4}
                    step={0.0025}
                    min={0}
                    onChange={(value) => onPriceChange?.(component.id, perBblFromGal(value))}
                  />
                </label>
              ) : null}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground md:sr-only">Implied $/gal</Label>
                <p className="flex min-h-11 items-center justify-end font-mono text-sm tabular-nums md:h-8 md:min-h-0">
                  {locked ? "E10 lock" : formatPerGal(impliedGal)}
                </p>
              </div>
              {editPrices ? (
                <label className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground md:sr-only">Must-use bbl</Label>
                  <NumberField
                    aria-label={`${component.name} must-use barrels`}
                    value={component.minLiftBbl}
                    digits={0}
                    step={50}
                    min={0}
                    onChange={(value) => onMustUseChange?.(component.id, value)}
                  />
                </label>
              ) : (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground md:sr-only">Your $/gal</Label>
                  <p className="flex min-h-11 items-center justify-end font-mono text-sm tabular-nums md:h-8 md:min-h-0">
                    {formatPerGal(marketGal)}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground md:sr-only">Bid</Label>
                <div className="flex min-h-11 items-center justify-end md:h-8 md:min-h-0">
                  {locked ? (
                    <Badge variant="outline">Splash</Badge>
                  ) : seek == null ? (
                    <Badge variant="outline">Seek</Badge>
                  ) : clears ? (
                    <Badge className="bg-teal-500/15 text-teal-800">Buy</Badge>
                  ) : (
                    <Badge variant="destructive">Pass</Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-muted-foreground">
          {editPrices
            ? "Must-use is how you lock a naphtha tank you already own into the blend. Leave it at 0 to treat the stream as a purchase you can take or leave."
            : "Must-use and market $/gal are typed on Inputs."}
        </p>
      </CardContent>
    </Card>
  );
}
