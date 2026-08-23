"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createDefaultPlant,
  formatMoney,
  optimizePlant,
  refreshTankSpecs,
  seekNaphtha,
  type Blendstock,
  type NaphthaSeekResult,
  type Plant,
  type PlantSolve,
  type ProductSpecs,
  type ProductTank,
  type SolverStatus,
  type TankId,
} from "@/lib/blend";
import { AlertTriangle, RotateCcw, Sparkles } from "lucide-react";
import { AssayDialog } from "./assay-dialog";
import { Assumptions } from "./assumptions";
import { BlendstockTable } from "./blendstock-table";
import { NaphthaPanel } from "./naphtha-panel";
import { NumberField } from "./number-field";
import { TankCard } from "./tank-card";

const initialPlant = createDefaultPlant();
const initialSolve = optimizePlant(initialPlant);
const initialLight = seekNaphtha(initialPlant, "light", 72);
const initialHeavy = seekNaphtha(initialPlant, "heavy", 68);

export function BlenderApp() {
  const [plant, setPlant] = useState<Plant>(initialPlant);
  const [solve, setSolve] = useState<PlantSolve>(initialSolve);
  const [solverStatus, setSolverStatus] = useState<SolverStatus>(initialSolve.status);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightPrice, setLightPrice] = useState(72);
  const [heavyPrice, setHeavyPrice] = useState(68);
  const [lightResult, setLightResult] = useState<NaphthaSeekResult | null>(initialLight);
  const [heavyResult, setHeavyResult] = useState<NaphthaSeekResult | null>(initialHeavy);

  const editing = plant.components.find((component) => component.id === editingId) ?? null;

  function applySolve(next: Plant) {
    const result = optimizePlant(next);
    setPlant(next);
    setSolve(result);
    setSolverStatus(result.status);
    return result;
  }

  function solveCurrent() {
    applySolve(plant);
    setLightResult(seekNaphtha(plant, "light", lightPrice));
    setHeavyResult(seekNaphtha(plant, "heavy", heavyPrice));
  }

  function resetPlant() {
    const next = createDefaultPlant();
    applySolve(next);
    setLightPrice(72);
    setHeavyPrice(68);
    setLightResult(null);
    setHeavyResult(null);
  }

  function updateTank(id: TankId, patch: Partial<ProductTank>) {
    const next: Plant = {
      ...plant,
      tanks: plant.tanks.map((tank) => {
        if (tank.id !== id) return tank;
        const merged = { ...tank, ...patch };
        return refreshTankSpecs(merged, plant.complianceOverlay);
      }),
    };
    applySolve(next);
  }

  function updateTankSpecs(id: TankId, patch: Partial<ProductSpecs>) {
    setPlant((current) => ({
      ...current,
      tanks: current.tanks.map((tank) =>
        tank.id === id ? { ...tank, specs: { ...tank.specs, ...patch } } : tank,
      ),
    }));
    setSolverStatus("idle");
  }

  function updateComponent(id: string, patch: Partial<Blendstock>) {
    setPlant((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === id ? { ...component, ...patch } : component,
      ),
    }));
    setSolverStatus("idle");
  }

  function updateRvo<K extends keyof Plant["rvo"]>(key: K, value: Plant["rvo"][K]) {
    applySolve({ ...plant, rvo: { ...plant.rvo, [key]: value } });
  }

  function setOverlay(complianceOverlay: boolean) {
    const next: Plant = {
      ...plant,
      complianceOverlay,
      tanks: plant.tanks.map((tank) => refreshTankSpecs(tank, complianceOverlay)),
    };
    applySolve(next);
  }

  function runSeek() {
    setLightResult(seekNaphtha(plant, "light", lightPrice));
    setHeavyResult(seekNaphtha(plant, "heavy", heavyPrice));
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_46%)]">
      <header className="border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-medium tracking-[0.18em] text-amber-800 uppercase">
                  Blend header
                </p>
                <Badge variant="outline">P1 · P2 · P3</Badge>
                <Badge variant="outline">CPL / Explorer / SFPP / Mexico</Badge>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                Gasoline blender
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                One pool, three product tanks. Allocate barrels to Regular, Midgrade, and
                Premium against pipeline slates, then goal-seek light and heavy naphtha into
                a domestic barrel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetPlant}>
                <RotateCcw data-icon="inline-start" />
                Reset plant
              </Button>
              <Button onClick={solveCurrent}>
                <Sparkles data-icon="inline-start" />
                Solve plant
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <div className="flex items-end justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
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
            <div className="flex items-end justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
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
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        {solverStatus === "infeasible" ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>No feasible plant allocation</AlertTitle>
            <AlertDescription>{solve.message}</AlertDescription>
          </Alert>
        ) : null}

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>Plant economics</CardTitle>
            <CardDescription>
              {solverStatus === "optimal"
                ? solve.message
                : "Numbers update when you solve. Manual assay edits wait for the next solve."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Revenue" value={formatMoney(solve.revenue, 0)} hint="Rack × tank demand" />
              <Metric label="Blend cost" value={formatMoney(solve.blendCost, 0)} hint="Component barrels" />
              <Metric label="RVO net" value={formatMoney(solve.rvoCost, 0)} hint="Obligation − ethanol RINs" />
              <Metric
                label="Margin"
                value={formatMoney(solve.margin, 0)}
                hint={solve.margin !== null && solve.margin >= 0 ? "Over rack after RVO" : "Under rack"}
                tone={solve.margin === null ? "muted" : solve.margin >= 0 ? "good" : "bad"}
              />
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          {plant.tanks.map((tank) => (
            <TankCard
              key={tank.id}
              tank={tank}
              components={plant.components}
              solve={solve}
              complianceOverlay={plant.complianceOverlay}
              onChange={(patch) => updateTank(tank.id, patch)}
              onSpecChange={(patch) => updateTankSpecs(tank.id, patch)}
            />
          ))}
        </div>

        <NaphthaPanel
          lightPrice={lightPrice}
          heavyPrice={heavyPrice}
          lightResult={lightResult}
          heavyResult={heavyResult}
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
              Light and heavy naphtha are the goal-seek streams.
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

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>Model notes</CardTitle>
            <CardDescription>Pipeline slates, overlay, and what “creates a domestic barrel” means.</CardDescription>
          </CardHeader>
          <CardContent>
            <Assumptions />
          </CardContent>
        </Card>
      </main>

      <AssayDialog
        component={editing}
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        onChange={(patch) => {
          if (editingId) updateComponent(editingId, patch);
        }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "muted" | "good" | "bad" | "warn";
}) {
  const hintClass = {
    muted: "text-muted-foreground",
    good: "text-emerald-800",
    bad: "text-red-700",
    warn: "text-amber-800",
  }[tone];
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-lg tabular-nums">{value}</dd>
      <p className={`text-[11px] ${hintClass}`}>{hint}</p>
    </div>
  );
}
