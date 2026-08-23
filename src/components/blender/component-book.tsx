"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatMoney, formatNumber, perGalFromBbl } from "@/lib/blend";
import { bookPricePerBbl } from "@/lib/marks/component-book";
import { NumberField } from "./number-field";
import { OptionalNumberField } from "./optional-number-field";
import { usePlant } from "./plant-context";

export function ComponentBookCard() {
  const { plant, updateComponentBook, updateLiftEpsilon } = usePlant();
  const gcCbob = plant.marks.gcCbobPerBbl;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>Component book vs GC CBOB</CardTitle>
        <CardDescription>
          Platts Daily does not publish alkylate, FCC, reformate, nC4, isomerate, or naphtha. Type
          the basis in cents per gallon versus GC CBOB. Book price is GC CBOB $/bbl + basis × 0.42
          unless you set an absolute $/bbl override. Empty is not a typical spread.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex max-w-xs flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Lift epsilon, $/bbl</Label>
          <NumberField
            value={plant.liftEpsilonPerBbl}
            digits={2}
            step={0.05}
            min={0}
            onChange={updateLiftEpsilon}
          />
          <p className="text-[11px] text-muted-foreground">
            DON&apos;T LIFT if implied is more than this below book.
          </p>
        </label>

        <div className="hidden grid-cols-[minmax(0,1.1fr)_5.5rem_5.75rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-1 text-[10px] tracking-wide text-muted-foreground uppercase md:grid">
          <span>Stream</span>
          <span className="text-right">Basis cpg</span>
          <span className="text-right">Override $/bbl</span>
          <span>Book</span>
          <span>Notes</span>
        </div>
        {plant.componentBook.map((row) => {
          const priced = bookPricePerBbl(row, gcCbob);
          return (
            <div
              key={row.streamKey}
              className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border/80 px-2.5 py-2 md:grid-cols-[minmax(0,1.1fr)_5.5rem_5.75rem_minmax(0,1fr)_minmax(0,1fr)]"
            >
              <div className="col-span-2 min-w-0 md:col-span-1">
                <p className="font-medium">{row.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{row.streamKey}</p>
              </div>
              <label className="space-y-1">
                <Label className="text-[10px] text-muted-foreground md:sr-only">Basis cpg</Label>
                <OptionalNumberField
                  value={row.basisCpg}
                  digits={2}
                  step={0.25}
                  aria-label={`${row.name} basis vs GC CBOB, cpg`}
                  onChange={(value) => updateComponentBook(row.streamKey, { basisCpg: value })}
                />
              </label>
              <label className="space-y-1">
                <Label className="text-[10px] text-muted-foreground md:sr-only">Override $/bbl</Label>
                <OptionalNumberField
                  value={row.overridePerBbl}
                  digits={2}
                  step={0.25}
                  aria-label={`${row.name} absolute override, $/bbl`}
                  onChange={(value) => updateComponentBook(row.streamKey, { overridePerBbl: value })}
                />
              </label>
              <div className="text-xs">
                <p className="mb-1 text-[10px] text-muted-foreground md:hidden">Book</p>
                {priced.price === null ? (
                  <p className="text-rose-700">
                    stale / missing
                    {gcCbob === null ? " — no GC CBOB" : " — type a basis"}
                  </p>
                ) : (
                  <p className="font-mono tabular-nums">
                    {formatMoney(priced.price, 3)}/bbl
                    <span className="ml-1 text-muted-foreground">
                      ({formatMoney(perGalFromBbl(priced.price), 4)}/gal · {priced.origin})
                    </span>
                  </p>
                )}
              </div>
              <label className="col-span-2 md:col-span-1">
                <Label className="text-[10px] text-muted-foreground md:sr-only">Notes</Label>
                <input
                  className="h-11 w-full rounded-lg border border-input bg-transparent px-2 text-base md:h-8 md:text-sm"
                  value={row.notes}
                  onChange={(event) => updateComponentBook(row.streamKey, { notes: event.target.value })}
                  aria-label={`${row.name} notes`}
                />
              </label>
            </div>
          );
        })}
        {gcCbob === null ? (
          <p className="text-xs text-rose-700">
            GC CBOB is stale / missing. Basis will not price a stream until Platts Daily has RB and
            GC_CBOB_Diff. Last typed component prices stay put.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            GC CBOB in the formula is {formatMoney(gcCbob, 4)}/bbl ({formatNumber(plant.marks.gcCbobCpg ?? 0, 2)}{" "}
            cpg).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
