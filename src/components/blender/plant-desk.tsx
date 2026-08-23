"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BlendstockTable } from "./blendstock-table";
import { NaphthaPanel } from "./naphtha-panel";
import { NumberField } from "./number-field";
import { usePlant } from "./plant-context";

export function PlantDesk() {
  const {
    plant,
    solve,
    lightPrice,
    heavyPrice,
    lightResult,
    heavyResult,
    busy,
    setLightPrice,
    setHeavyPrice,
    runSeek,
    updateComponent,
    updateRvo,
    setOverlay,
    setEditingId,
  } = usePlant();

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-end justify-between rounded-xl border border-border bg-card/80 px-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Tier 3 / MSAT2 overlay</Label>
            <p className="text-xs text-muted-foreground">10 ppm S and 0.62% benzene on US CBOB</p>
          </div>
          <Switch
            checked={plant.complianceOverlay}
            onCheckedChange={setOverlay}
            aria-label="Tier 3 and MSAT2 overlay"
          />
        </div>
        <div className="flex items-end justify-between rounded-xl border border-border bg-card/80 px-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">RVO</Label>
            <p className="text-xs text-muted-foreground">Obligation on finished gasoline, RINs on ethanol</p>
          </div>
          <Switch
            checked={plant.rvo.enabled}
            onCheckedChange={(checked) => updateRvo("enabled", checked)}
            aria-label="Enable RVO"
          />
        </div>
        <label className="space-y-1">
          <Label className="text-xs text-muted-foreground">RVO rate, %</Label>
          <NumberField
            value={plant.rvo.obligationRate * 100}
            digits={1}
            step={0.5}
            onChange={(value) => updateRvo("obligationRate", value / 100)}
          />
        </label>
        <label className="space-y-1">
          <Label className="text-xs text-muted-foreground">D6 RIN, $/RIN</Label>
          <NumberField
            value={plant.rvo.d6RinPrice}
            digits={2}
            step={0.05}
            onChange={(value) => updateRvo("d6RinPrice", value)}
          />
        </label>
      </div>

      <NaphthaPanel
        lightPrice={lightPrice}
        heavyPrice={heavyPrice}
        lightResult={lightResult}
        heavyResult={heavyResult}
        busy={busy === "seek"}
        onPriceChange={(kind, price) => {
          if (kind === "light") setLightPrice(price);
          else setHeavyPrice(price);
        }}
        onSeek={runSeek}
      />

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle>Shared blendstock pool</CardTitle>
          <CardDescription>
            Inventories are barrels available this cycle. Used is the sum across P1, P2, and P3.
            Open a tank page to edit that grade without the other two stacked beside it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BlendstockTable
            components={plant.components}
            usedBbl={solve.componentUsedBbl}
            onComponentChange={updateComponent}
            onEdit={setEditingId}
          />
        </CardContent>
      </Card>
    </>
  );
}
