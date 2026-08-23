"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  REGION_OPTIONS,
  componentsForRegion,
  formatMoney,
  formatNumber,
  perBblFromGal,
  perGalFromBbl,
  regionNote,
  type RegionId,
} from "@/lib/blend";
import { bookPricePerBbl } from "@/lib/marks/component-book";
import { Pencil } from "lucide-react";
import { NumberField } from "./number-field";
import { OptionalNumberField } from "./optional-number-field";
import { TermTip } from "./term-tip";
import { usePlant } from "./plant-context";

export function ComponentInputs({ regionId }: { regionId?: RegionId }) {
  const { plant, solve, updateComponent, updateComponentBook, setEditingId, setActiveRegion } = usePlant();
  const gcCbob = plant.marks.gcCbobPerBbl;

  useEffect(() => {
    if (regionId) setActiveRegion(regionId);
  }, [regionId, setActiveRegion]);
  const regions = regionId
    ? REGION_OPTIONS.filter((region) => region.id === regionId)
    : REGION_OPTIONS;

  return (
    <div className="space-y-4">
      {plant.bookLoadError ? <p className="text-xs text-rose-700">{plant.bookLoadError}</p> : null}
      {regions.map((region) => {
        const components = componentsForRegion(plant.components, region.id);
        return (
          <Card key={region.id} size="sm">
            <CardHeader className="border-b">
              <CardTitle>{region.label} components</CardTitle>
              <CardDescription>{regionNote(region.id)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="hidden grid-cols-[1.4fr_4rem_5.25rem_5.5rem_5.25rem_5.5rem_minmax(0,1fr)_4.5rem] gap-2 px-1 text-[10px] tracking-wide text-muted-foreground uppercase lg:grid">
                <span>
                  <TermTip term="stream">Stream</TermTip>
                </span>
                <span>
                  <TermTip term="use">Use</TermTip>
                </span>
                <span className="text-right">
                  <TermTip term="inventory">Inv bbl</TermTip>
                </span>
                <span className="text-right">
                  <TermTip term="mustUse">Must-use</TermTip>
                </span>
                <span className="text-right">
                  <TermTip term="marketGal">Market $/gal</TermTip>
                </span>
                <span className="text-right">
                  <TermTip term="basisCpg">Basis cpg</TermTip>
                </span>
                <span>
                  <TermTip term="book">Book</TermTip>
                </span>
                <span />
              </div>
              {components.map((component) => {
                const used = solve.componentUsedBbl[component.id] ?? 0;
                const left = component.inventoryBbl - used;
                const bookRow = plant.componentBook.find((row) => row.streamKey === component.streamKey);
                const priced = bookRow ? bookPricePerBbl(bookRow, gcCbob) : null;
                return (
                  <article
                    key={component.id}
                    className="grid grid-cols-2 items-end gap-2 rounded-xl border border-border/80 px-2.5 py-2 lg:grid-cols-[1.4fr_4rem_5.25rem_5.5rem_5.25rem_5.5rem_minmax(0,1fr)_4.5rem]"
                  >
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: component.color }} />
                        <p className="font-medium">{component.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {component.shortName} · {component.family}
                        {component.naphtha ? ` · ${component.naphtha} naphtha` : ""}
                        {component.priceStale ? " · stale / missing" : ""}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 lg:justify-center">
                      <span className="text-[10px] text-muted-foreground uppercase lg:sr-only">
                        <TermTip term="use">Use</TermTip>
                      </span>
                      <Switch
                        size="sm"
                        checked={component.enabled}
                        aria-label={`Use ${component.name}`}
                        onCheckedChange={(checked) => updateComponent(component.id, { enabled: checked })}
                      />
                    </label>
                    <label className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground lg:sr-only">
                        <TermTip term="inventory">Inv bbl</TermTip>
                      </Label>
                      <NumberField
                        aria-label={`${component.name} inventory barrels`}
                        value={component.inventoryBbl}
                        min={0}
                        step={10}
                        digits={0}
                        onChange={(value) =>
                          updateComponent(component.id, {
                            inventoryBbl: value,
                            maxLiftBbl: Math.max(component.maxLiftBbl, value),
                          })
                        }
                      />
                    </label>
                    <label className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground lg:sr-only">
                        <TermTip term="mustUse">Must-use bbl</TermTip>
                      </Label>
                      <NumberField
                        aria-label={`${component.name} must-use barrels`}
                        value={component.minLiftBbl}
                        min={0}
                        step={50}
                        digits={0}
                        onChange={(value) => updateComponent(component.id, { minLiftBbl: value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground lg:sr-only">
                        <TermTip term="marketGal">Market $/gal</TermTip>
                      </Label>
                      <NumberField
                        aria-label={`${component.name} market dollars per gallon`}
                        value={perGalFromBbl(component.costPerBbl)}
                        step={0.0025}
                        digits={4}
                        min={0}
                        onChange={(value) => updateComponent(component.id, { costPerBbl: perBblFromGal(value) })}
                      />
                    </label>
                    <label className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground lg:sr-only">
                        <TermTip term="basisCpg">Basis vs GC CBOB, cpg</TermTip>
                      </Label>
                      {bookRow ? (
                        <OptionalNumberField
                          value={bookRow.basisCpg}
                          digits={2}
                          step={0.25}
                          aria-label={`${component.name} basis vs GC CBOB, cpg`}
                          onChange={(value) => updateComponentBook(bookRow.streamKey, { basisCpg: value })}
                        />
                      ) : (
                        <p className="flex h-11 items-center text-xs text-muted-foreground md:h-8">Platts / typed</p>
                      )}
                    </label>
                    <div className="col-span-2 text-xs lg:col-span-1">
                      <p className="mb-1 text-[10px] text-muted-foreground uppercase lg:hidden">
                        <TermTip term="book">Book</TermTip> / used
                      </p>
                      {priced ? (
                        priced.price === null ? (
                          <p className="text-rose-700">
                            stale / missing
                            {gcCbob === null ? " — no GC CBOB" : " — empty Airtable basis"}
                          </p>
                        ) : (
                          <p className="font-mono tabular-nums">
                            {formatMoney(priced.price, 3)}/bbl
                            <span className="ml-1 text-muted-foreground">
                              ({component.priceOrigin === "typed" ? "typed" : bookRow?.source ?? "stale"})
                            </span>
                          </p>
                        )
                      ) : (
                        <p className="font-mono tabular-nums">{formatMoney(component.costPerBbl, 3)}/bbl</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Used {formatNumber(used, 0)} · left {formatNumber(left, 0)}
                      </p>
                    </div>
                    <div className="col-span-2 flex justify-end lg:col-span-1 lg:justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${component.name} assay`}
                        onClick={() => setEditingId(component.id)}
                      >
                        <Pencil />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
