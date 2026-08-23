"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { regionLabel } from "@/lib/blend";
import { NaphthaPanel } from "./naphtha-panel";
import { NumberField } from "./number-field";
import { PoolCard } from "./pool-card";
import { usePlant } from "./plant-context";
import { RegionSwitcher } from "./region-switcher";

export function PlantDesk() {
  const {
    plant,
    solve,
    activeRegion,
    setActiveRegion,
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

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Regional pools</h2>
          <p className="text-xs text-muted-foreground">
            Colonial, Explorer, West Coast, and Mexico each have their own barrels. A tank only
            draws from the pool that matches its spec slate.
          </p>
        </div>
        <RegionSwitcher plant={plant} value={activeRegion} onChange={setActiveRegion} />
      </section>

      <NaphthaPanel
        regionLabel={regionLabel(activeRegion)}
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

      <PoolCard
        plant={plant}
        regionId={activeRegion}
        usedBbl={solve.componentUsedBbl}
        onComponentChange={updateComponent}
        onEdit={setEditingId}
      />
    </>
  );
}
