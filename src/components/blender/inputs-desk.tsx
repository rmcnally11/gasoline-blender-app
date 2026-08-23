"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { REGION_OPTIONS } from "@/lib/blend";
import { ComponentBookCard } from "./component-book";
import { ComponentInputs } from "./component-inputs";
import { MarksHeader } from "./marks-header";
import { MobileWorkspace } from "./mobile-workspace";
import { NumberField } from "./number-field";
import { usePlant } from "./plant-context";

export function InputsDesk() {
  const { plant, activeRegion, updateRvo, setOverlay, updateLiftEpsilon } = usePlant();

  const rules = (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>Plant rules</CardTitle>
        <CardDescription>
          Overlay, RFS, and the lift cut. Component prices and inventory are in the region lists
          below. P1 / P2 / P3 only hold the ticket — grade, heel, and the destination marker.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border px-3 py-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Label className="text-xs text-muted-foreground">Finished overlay (Tier 3 / MSAT2)</Label>
            <p className="text-xs text-muted-foreground">
              10 ppm S / 0.62% benzene on the FINISHED row only. Pipe CBOB receipt stays 80 ppm / 3.8%.
            </p>
          </div>
          <Switch
            checked={plant.complianceOverlay}
            onCheckedChange={setOverlay}
            aria-label="Tier 3 and MSAT2 overlay"
          />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border px-3 py-2 md:flex-row md:items-end md:justify-between">
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
        <label className="space-y-1">
          <Label className="text-xs text-muted-foreground">Lift cut, $/bbl</Label>
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
      </CardContent>
    </Card>
  );

  return (
    <MobileWorkspace
      forceTabs
      storageKey="inputs"
      defaultSection={activeRegion}
      sections={[
        {
          id: "rules",
          label: "Rules",
          content: (
            <>
              <MarksHeader />
              <ComponentBookCard />
              {rules}
            </>
          ),
        },
        ...REGION_OPTIONS.map((region) => ({
          id: region.id,
          label: region.id === "west-coast" ? "SFPP" : region.label,
          content: <ComponentInputs regionId={region.id} />,
        })),
      ]}
    />
  );
}
