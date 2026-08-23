"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ETHANOL_OPTIONS,
  GRADE_OPTIONS,
  SEASON_OPTIONS,
  SLATE_OPTIONS,
  evaluateSpecs,
  formatNumber,
  formatPerGal,
  slateNote,
  type PlantSolve,
  type ProductSpecs,
  type ProductTank,
} from "@/lib/blend";
import { FieldSelect } from "./field-select";
import { NumberField } from "./number-field";
import { RecipeBar } from "./recipe-bar";
import { SpecSheet } from "./spec-sheet";

export function TankCard({
  tank,
  components,
  solve,
  complianceOverlay,
  onChange,
  onSpecChange,
}: {
  tank: ProductTank;
  components: import("@/lib/blend").Blendstock[];
  solve: PlantSolve;
  complianceOverlay: boolean;
  onChange: (patch: Partial<ProductTank>) => void;
  onSpecChange: (patch: Partial<ProductSpecs>) => void;
}) {
  const tankSolve = solve.tanks.find((item) => item.tankId === tank.id);
  const checks = evaluateSpecs(tank, tankSolve?.properties ?? null);
  const failed = checks.filter((check) => check.status === "fail");
  const binding = checks.filter((check) => check.binding);
  const rvpNote = tank.rvpWaiver
    ? `${tank.specs.rvpMaxPsi.toFixed(1)} psi + 1.0 waiver`
    : `${tank.specs.rvpMaxPsi.toFixed(1)} psi class`;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{tank.name}</CardTitle>
            <CardDescription>{slateNote(tank.slateId, complianceOverlay)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {failed.length > 0 ? <Badge variant="destructive">Off spec</Badge> : null}
            {failed.length === 0 && binding.length > 0 ? (
              <Badge className="bg-amber-500/15 text-amber-800">Binding</Badge>
            ) : null}
            <Switch checked={tank.enabled} onCheckedChange={(checked) => onChange({ enabled: checked })} aria-label={`Enable ${tank.id}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSelect
            label="Grade"
            value={tank.gradeId}
            onChange={(value) => onChange({ gradeId: value as ProductTank["gradeId"] })}
            options={GRADE_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
          />
          <FieldSelect
            label="Spec slate / region"
            value={tank.slateId}
            onChange={(value) => onChange({ slateId: value as ProductTank["slateId"] })}
            options={SLATE_OPTIONS.map((option) => ({
              id: option.id,
              label: `${option.label} · ${option.region}`,
            }))}
          />
          <FieldSelect
            label="Season"
            value={tank.seasonId}
            onChange={(value) => onChange({ seasonId: value as ProductTank["seasonId"] })}
            options={SEASON_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
          />
          <FieldSelect
            label="Ethanol"
            value={tank.ethanolMode}
            onChange={(value) => onChange({ ethanolMode: value as ProductTank["ethanolMode"] })}
            options={ETHANOL_OPTIONS}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">Blend demand, bbl</Label>
            <NumberField value={tank.demandBbl} digits={0} step={50} min={0} onChange={(value) => onChange({ demandBbl: value })} />
          </label>
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tank inventory, bbl</Label>
            <NumberField value={tank.inventoryBbl} digits={0} step={50} min={0} onChange={(value) => onChange({ inventoryBbl: value })} />
          </label>
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">Capacity, bbl</Label>
            <NumberField value={tank.capacityBbl} digits={0} step={100} min={tank.heelBbl} onChange={(value) => onChange({ capacityBbl: value })} />
          </label>
          <div className="flex items-end justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-xs text-muted-foreground">1-psi waiver</p>
              <p className="text-[11px] text-muted-foreground">CBOB ethanol</p>
            </div>
            <Switch checked={tank.rvpWaiver} onCheckedChange={(checked) => onChange({ rvpWaiver: checked })} aria-label={`${tank.id} RVP waiver`} />
          </div>
        </div>
        <RecipeBar components={components} recipe={tankSolve?.recipe ?? { volumes: {} }} />
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="AKI" value={formatNumber(tankSolve?.properties?.aki, 2)} />
          <Metric label="RVP" value={formatNumber(tankSolve?.properties?.rvp, 2)} />
          <Metric label="S ppm" value={formatNumber(tankSolve?.properties?.sulfurPpm, 1)} />
          <Metric label="Benzene" value={formatNumber(tankSolve?.properties?.benzeneVolPct, 2)} />
          <Metric label="DI" value={formatNumber(tankSolve?.properties?.di, 0)} />
          <Metric
            label="Blend $/gal"
            value={formatPerGal(
              tankSolve?.properties ? tankSolve.properties.costPerBbl / 42 : null,
            )}
          />
        </dl>
        <p className="text-[11px] text-muted-foreground">
          Opening {formatNumber(tank.inventoryBbl, 0)} bbl · heel {formatNumber(tank.heelBbl, 0)} · capacity {formatNumber(tank.capacityBbl, 0)} bbl. Demand is the blend volume this cycle.
        </p>
        <SpecSheet checks={checks} specs={tank.specs} onSpecChange={onSpecChange} rvpNote={rvpNote} />
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
