"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { componentsForRegion, regionLabel } from "@/lib/blend";
import { ComponentBookCard } from "./component-book";
import { EconomicsStrip } from "./economics-strip";
import { MarketValues } from "./market-values";
import { MarksHeader } from "./marks-header";
import { MobileWorkspace } from "./mobile-workspace";
import { MoneyScreen } from "./money-screen";
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
    seeks,
    busy,
    runSeek,
    updateComponent,
    updateRvo,
    setOverlay,
    setEditingId,
  } = usePlant();

  const settings = (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 px-3 py-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Label className="text-xs text-muted-foreground">Finished overlay (Tier 3 / MSAT2)</Label>
          <p className="text-xs text-muted-foreground">
            10 ppm S / 0.62% benzene on the FINISHED row only. Pipe CBOB receipt stays 80 ppm / 3.8%. Off by default.
          </p>
        </div>
        <Switch
          checked={plant.complianceOverlay}
          onCheckedChange={setOverlay}
          aria-label="Tier 3 and MSAT2 overlay"
        />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 px-3 py-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Label className="text-xs text-muted-foreground">RFS / RVO</Label>
          <p className="text-xs text-muted-foreground">
            Obligation on hydrocarbon gallons. RINs on neat ethanol after denaturant. Mexico off.
          </p>
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
        <Label className="text-xs text-muted-foreground">
          D6 RIN, $/RIN
          {plant.rvo.d6Stale || plant.marks.d6Stale ? (
            <span className="ml-1 text-rose-700">stale / missing</span>
          ) : null}
        </Label>
        <NumberField
          value={plant.rvo.d6RinPrice}
          digits={4}
          step={0.05}
          onChange={(value) => updateRvo("d6RinPrice", value)}
        />
        <p className="text-[11px] text-muted-foreground">
          {plant.marks.d6Cts === null
            ? "Not from Platts Daily. Typing here is last typed, not a dummy $0.85 mark."
            : `${plant.marks.d6Cts.toFixed(2)} cts/RIN from Platts → $${plant.rvo.d6RinPrice.toFixed(4)}/RIN.`}
        </p>
      </label>
      <label className="space-y-1">
        <Label className="text-xs text-muted-foreground">Ethanol denaturant, vol%</Label>
        <NumberField
          value={plant.rvo.denaturantVolFrac * 100}
          digits={1}
          step={0.5}
          min={0}
          onChange={(value) => updateRvo("denaturantVolFrac", value / 100)}
        />
      </label>
    </div>
  );

  const destinations = (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Destination markets</h2>
        <p className="text-xs text-muted-foreground">
          Colonial, Explorer, West Coast, and Mexico are separate books. A tank&apos;s spec
          slate is the market you can ship into. Components are valued against that marker.
        </p>
      </div>
      <RegionSwitcher plant={plant} value={activeRegion} onChange={setActiveRegion} />
    </section>
  );

  const marketValues = (
    <MarketValues
      regionLabel={regionLabel(activeRegion)}
      components={componentsForRegion(plant.components, activeRegion)}
      seeks={seeks}
      busy={busy === "seek"}
      onPriceChange={(id, costPerBbl) => updateComponent(id, { costPerBbl })}
      onMustUseChange={(id, minLiftBbl) => updateComponent(id, { minLiftBbl })}
      onSeek={runSeek}
    />
  );

  const pool = (
    <PoolCard
      plant={plant}
      regionId={activeRegion}
      usedBbl={solve.componentUsedBbl}
      onComponentChange={updateComponent}
      onEdit={setEditingId}
    />
  );

  return (
    <MobileWorkspace
      storageKey="plant"
      defaultSection="money"
      desktop={
        <>
          {settings}
          <MoneyScreen />
          <ComponentBookCard />
          {destinations}
          {marketValues}
          {pool}
        </>
      }
      sections={[
        {
          id: "money",
          label: "Money",
          content: (
            <>
              <div className="space-y-4 md:hidden">
                <MarksHeader />
                <EconomicsStrip />
              </div>
              <MoneyScreen />
            </>
          ),
        },
        { id: "book", label: "Book", content: <ComponentBookCard /> },
        {
          id: "markets",
          label: "Markets",
          content: (
            <>
              {settings}
              {destinations}
              {marketValues}
            </>
          ),
        },
        { id: "pool", label: "Pool", content: pool },
      ]}
    />
  );
}
