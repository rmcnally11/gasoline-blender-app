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
  rvpClassLabel,
  slateNote,
  tankWaiverApplied,
  waiverEligible,
  type HeelQuality,
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
  const eligible = waiverEligible(tank.slateId, tank.seasonId, tank.ethanolMode);
  const applied = tankWaiverApplied(tank);
  const lpRvp = tankSolve?.lpRvpLimit ?? tank.specs.rvpMaxPsi;
  const rvpNote = `Class ${tankSolve?.rvpClassPsi.toFixed(1) ?? tank.pipeSpecs.rvpMaxPsi.toFixed(1)} psi · LP using ${lpRvp.toFixed(1)} · pipe CBOB ${tank.pipeSpecs.rvpMaxPsi.toFixed(1)} · finished E10 ${tank.finishedSpecs.rvpMaxPsi.toFixed(1)}${applied ? " (1-psi waiver)" : ""}`;
  const cleanBatch = tank.heelBbl <= 0.5;
  const bons = (tankSolve?.bonsUsed ?? []).filter(
    (item) => item.streamKey === "ethanol" || item.streamKey === "fcc" || item.streamKey === "alkylate",
  );

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{tank.name}</CardTitle>
            <CardDescription>{slateNote(tank.slateId, complianceOverlay)}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {failed.length > 0 ? <Badge variant="destructive">Mixed tank fails</Badge> : null}
            {failed.length === 0 && cleanBatch && tankSolve?.properties ? (
              <Badge variant="outline">Clean batch</Badge>
            ) : null}
            {failed.length === 0 && !cleanBatch && binding.length > 0 ? (
              <Badge className="bg-amber-500/15 text-amber-800">Binding</Badge>
            ) : null}
            {failed.length === 0 && !cleanBatch && tankSolve?.properties && binding.length === 0 ? (
              <Badge className="bg-emerald-500/15 text-emerald-800">On spec</Badge>
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
            label="Season / RVP class"
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
          <FieldSelect
            label="GC rack product"
            value={tank.rackProduct ?? "manual"}
            onChange={(value) => onChange({ rackProduct: value as ProductTank["rackProduct"] })}
            options={[
              { id: "cbob", label: "GC CBOB (Regular / P1–P3 default)" },
              { id: "unl87", label: "GC Unl87" },
              { id: "cbob93", label: "GC CBOB93 / Premium" },
              { id: "manual", label: "Manual / last typed" },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Destination marker, $/gal
              {tank.rackStale ? <span className="ml-1 text-amber-800">stale / missing</span> : null}
            </Label>
            <NumberField
              value={tank.rackPricePerBbl / 42}
              digits={4}
              step={0.0025}
              min={0}
              onChange={(value) => onChange({ rackPricePerBbl: value * 42 })}
            />
            <p className="text-[11px] text-muted-foreground">
              {tank.rackMarksLabel ?? "last typed"}
              {tank.rackStale ? " — not Platts" : ""}
            </p>
          </label>
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">Freight / tariff, $/gal</Label>
            <NumberField
              value={tank.freightPerGal}
              digits={4}
              step={0.0025}
              min={0}
              onChange={(value) => onChange({ freightPerGal: value })}
            />
          </label>
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ship volume, bbl</Label>
            <NumberField value={tank.demandBbl} digits={0} step={50} min={0} onChange={(value) => onChange({ demandBbl: value })} />
          </label>
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">Opening inventory, bbl</Label>
            <NumberField value={tank.inventoryBbl} digits={0} step={50} min={0} onChange={(value) => onChange({ inventoryBbl: value })} />
          </label>
          <label className="space-y-1">
            <Label className="text-xs text-muted-foreground">Capacity, bbl</Label>
            <NumberField value={tank.capacityBbl} digits={0} step={100} min={tank.heelBbl} onChange={(value) => onChange({ capacityBbl: value })} />
          </label>
          <div className="col-span-2 flex flex-col gap-2 rounded-lg border border-border px-3 py-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">1-psi waiver</p>
              <p className="text-[11px] text-muted-foreground">
                {eligible
                  ? applied
                    ? "On — E10 in a 9.0 class. Finished RVP +1. Pipe CBOB unchanged."
                    : "Eligible (E10 + 9.0). Off — finished stays at class."
                  : "Off. Only E10 in a true 9.0 class gets +1. Not 7.8."}
              </p>
            </div>
            <Switch
              checked={tank.rvpWaiver}
              onCheckedChange={(checked) => onChange({ rvpWaiver: checked })}
              aria-label={`${tank.id} RVP waiver`}
            />
          </div>
        </div>

        <section className="space-y-2 rounded-lg border border-border p-3">
          <div>
            <h3 className="text-sm font-medium">Heel in the mix</h3>
            <p className="text-[11px] text-muted-foreground">
              Blend = heel + new components. Inventory and capacity constrain the lift. A zero-heel
              run is a clean-batch thought experiment — it will not print On spec.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <Label className="text-xs text-muted-foreground">Heel, bbl</Label>
              <NumberField
                value={tank.heelBbl}
                digits={0}
                step={50}
                min={0}
                onChange={(value) => onChange({ heelBbl: value })}
              />
            </label>
            <HeelField tank={tank} label="Heel RON" field="ron" digits={1} step={0.1} onChange={onChange} />
            <HeelField tank={tank} label="Heel MON" field="mon" digits={1} step={0.1} onChange={onChange} />
            <HeelField tank={tank} label="Heel RVP" field="rvp" digits={1} step={0.1} onChange={onChange} />
            <HeelField tank={tank} label="Heel S, ppm" field="sulfurPpm" digits={1} step={1} onChange={onChange} />
            <HeelField tank={tank} label="Heel benzene" field="benzeneVolPct" digits={2} step={0.05} onChange={onChange} />
            <HeelField tank={tank} label="Heel T50" field="t50F" digits={0} step={1} onChange={onChange} />
            <HeelField tank={tank} label="Heel T90" field="t90F" digits={0} step={1} onChange={onChange} />
          </div>
        </section>

        {tankSolve?.mixedFails ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            Mixed tank fails. Heel + new components miss {tankSolve.failReasons.join(", ")}. This is
            not on-spec.
          </div>
        ) : null}
        {cleanBatch && tankSolve?.properties && failed.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Zero heel — clean-batch thought experiment. Recipe math is shown. It is not a tank ticket
            and will not print On spec.
          </div>
        ) : null}

        <p className="text-[11px] text-muted-foreground">
          {rvpClassLabel(tank.slateId, tank.seasonId)}. LP RVP {lpRvp.toFixed(1)} psi
          {applied ? " (finished waiver on)" : " (waiver not applied to the LP number)"}.
        </p>
        <RecipeBar components={components} recipe={tankSolve?.recipe ?? { volumes: {} }} />
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="AKI" value={formatNumber(tankSolve?.properties?.aki, 2)} />
          <Metric label="RVP" value={formatNumber(tankSolve?.properties?.rvp, 2)} />
          <Metric label="S ppm" value={formatNumber(tankSolve?.properties?.sulfurPpm, 1)} />
          <Metric label="Benzene" value={formatNumber(tankSolve?.properties?.benzeneVolPct, 2)} />
          <Metric label="DI" value={formatNumber(tankSolve?.properties?.di, 0)} />
          <Metric
            label="New components $/gal"
            value={formatPerGal(
              tankSolve?.properties ? tankSolve.properties.costPerBbl / 42 : null,
            )}
          />
        </dl>
        {bons.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            BON used:{" "}
            {bons.map((item) => `${item.name} ${item.blendingRon.toFixed(1)}/${item.blendingMon.toFixed(1)}`).join(" · ")}
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Opening {formatNumber(tank.inventoryBbl, 0)} bbl · heel {formatNumber(tank.heelBbl, 0)} · new{" "}
          {formatNumber(Math.max(0, tank.demandBbl - tank.heelBbl), 0)} · capacity{" "}
          {formatNumber(tank.capacityBbl, 0)} bbl. Ship volume is the mixed tank.
        </p>
        <SpecSheet
          checks={checks}
          specs={tank.specs}
          onSpecChange={onSpecChange}
          rvpNote={rvpNote}
          overlayOn={complianceOverlay}
        />
      </CardContent>
    </Card>
  );
}

function HeelField({
  tank,
  label,
  field,
  digits,
  step,
  onChange,
}: {
  tank: ProductTank;
  label: string;
  field: keyof HeelQuality;
  digits: number;
  step: number;
  onChange: (patch: Partial<ProductTank>) => void;
}) {
  return (
    <label className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <NumberField
        value={Number(tank.heel[field])}
        digits={digits}
        step={step}
        onChange={(value) => onChange({ heel: { ...tank.heel, [field]: value } })}
      />
    </label>
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
