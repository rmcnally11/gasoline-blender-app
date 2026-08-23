"use client";

import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ETHANOL_OPTIONS,
  GRADE_OPTIONS,
  SEASON_OPTIONS,
  applyEthanolMode,
  buildSpecs,
  createDefaultCase,
  evaluateSpecs,
  formatMoney,
  formatNumber,
  formatPct,
  gallonsPerBarrel,
  optimizeBlend,
  predictProperties,
  rackPricePerBbl,
  type Blendstock,
  type BlendCase,
  type EthanolMode,
  type GradeId,
  type ProductSpecs,
  type Recipe,
  type SeasonId,
  type SolverStatus,
} from "@/lib/blend";
import { AlertTriangle, RotateCcw, Sparkles } from "lucide-react";
import { AssayDialog } from "./assay-dialog";
import { Assumptions } from "./assumptions";
import { BlendstockTable } from "./blendstock-table";
import { RecipeBar } from "./recipe-bar";
import { SpecSheet } from "./spec-sheet";

const initialCase = createDefaultCase();
const initialSolve = optimizeBlend(initialCase);

export function BlenderApp() {
  const [blendCase, setBlendCase] = useState<BlendCase>(initialCase);
  const [recipe, setRecipe] = useState<Recipe>(initialSolve.recipe);
  const [solverStatus, setSolverStatus] = useState<SolverStatus>(initialSolve.status);
  const [solverMessage, setSolverMessage] = useState(initialSolve.message);
  const [editingId, setEditingId] = useState<string | null>(null);

  const properties = useMemo(
    () => predictProperties(blendCase.components, recipe),
    [blendCase.components, recipe],
  );
  const checks = useMemo(() => evaluateSpecs(blendCase, properties), [blendCase, properties]);
  const failed = checks.filter((check) => check.status === "fail");
  const binding = checks.filter((check) => check.binding);
  const volumePct = blendCase.components.reduce(
    (acc, component) => acc + (recipe.volumes[component.id] ?? 0) * 100,
    0,
  );
  const margin = properties ? blendCase.rackPricePerBbl - properties.costPerBbl : null;
  const editing = blendCase.components.find((component) => component.id === editingId) ?? null;

  function applySolve(nextCase: BlendCase) {
    const result = optimizeBlend(nextCase);
    setBlendCase(nextCase);
    setRecipe(result.recipe);
    setSolverStatus(result.status);
    setSolverMessage(result.message);
  }

  function solveCurrent() {
    applySolve(blendCase);
  }

  function resetCase() {
    const next = createDefaultCase();
    applySolve(next);
  }

  function setGrade(gradeId: GradeId) {
    const specs = {
      ...buildSpecs(gradeId, blendCase.seasonId, blendCase.ethanolMode),
      sulfurMaxPpm: blendCase.specs.sulfurMaxPpm,
      benzeneMaxVolPct: blendCase.specs.benzeneMaxVolPct,
      aromaticsMaxVolPct: blendCase.specs.aromaticsMaxVolPct,
      olefinsMaxVolPct: blendCase.specs.olefinsMaxVolPct,
    };
    applySolve({
      ...blendCase,
      gradeId,
      specs,
      rackPricePerBbl: rackPricePerBbl(gradeId),
    });
  }

  function setSeason(seasonId: SeasonId) {
    applySolve({
      ...blendCase,
      seasonId,
      specs: {
        ...blendCase.specs,
        rvpMaxPsi: buildSpecs(blendCase.gradeId, seasonId, blendCase.ethanolMode).rvpMaxPsi,
      },
    });
  }

  function setEthanolMode(ethanolMode: EthanolMode) {
    const components = applyEthanolMode(blendCase.components, ethanolMode);
    applySolve({
      ...blendCase,
      ethanolMode,
      components,
      specs: {
        ...blendCase.specs,
        oxygenMinWtPct: buildSpecs(blendCase.gradeId, blendCase.seasonId, ethanolMode).oxygenMinWtPct,
      },
    });
  }

  function setWaiver(rvpWaiver: boolean) {
    applySolve({ ...blendCase, rvpWaiver });
  }

  function updateSpecs(patch: Partial<ProductSpecs>) {
    setBlendCase((current) => ({ ...current, specs: { ...current.specs, ...patch } }));
    setSolverStatus("idle");
  }

  function updateComponent(id: string, patch: Partial<Blendstock>) {
    setBlendCase((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === id ? { ...component, ...patch } : component,
      ),
    }));
    if (patch.enabled === false) {
      setRecipe((current) => ({
        volumes: { ...current.volumes, [id]: 0 },
      }));
    }
    setSolverStatus("idle");
  }

  function updateVolume(id: string, volPct: number) {
    setRecipe((current) => ({
      volumes: { ...current.volumes, [id]: volPct / 100 },
    }));
    setSolverStatus("idle");
  }

  const rvpNote = blendCase.rvpWaiver
    ? `Chevron index · ${blendCase.specs.rvpMaxPsi.toFixed(1)} psi class + 1.0 waiver`
    : `Chevron index · ${blendCase.specs.rvpMaxPsi.toFixed(1)} psi class`;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_42%)]">
      <header className="border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-4 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium tracking-[0.18em] text-amber-400 uppercase">
                  Blend header
                </p>
                <Badge variant="outline">Single-grade LP</Badge>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Gasoline blender
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Minimum-cost recipe for a finished gasoline spec. Start here: one product,
                typical US blendstocks, and the constraints that actually bind.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetCase}>
                <RotateCcw data-icon="inline-start" />
                Reset pool
              </Button>
              <Button onClick={solveCurrent}>
                <Sparkles data-icon="inline-start" />
                Solve min-cost
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FieldSelect
              label="Finished grade"
              value={blendCase.gradeId}
              onChange={(value) => setGrade(value as GradeId)}
              options={GRADE_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
            />
            <FieldSelect
              label="RVP class"
              value={blendCase.seasonId}
              onChange={(value) => setSeason(value as SeasonId)}
              options={SEASON_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
            />
            <FieldSelect
              label="Ethanol"
              value={blendCase.ethanolMode}
              onChange={(value) => setEthanolMode(value as EthanolMode)}
              options={ETHANOL_OPTIONS}
            />
            <div className="flex items-end justify-between rounded-xl border border-border bg-card/60 px-3 py-2">
              <div>
                <Label className="text-xs text-muted-foreground">1-psi RVP waiver</Label>
                <p className="text-xs text-muted-foreground">Adds 1.0 psi for 9–10% ethanol</p>
              </div>
              <Switch
                checked={blendCase.rvpWaiver}
                onCheckedChange={setWaiver}
                aria-label="Enable 1 psi RVP waiver"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[88rem] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        {solverStatus === "infeasible" ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>No feasible recipe</AlertTitle>
            <AlertDescription>{solverMessage}</AlertDescription>
          </Alert>
        ) : null}

        {solverStatus === "idle" && failed.length > 0 ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Recipe is off spec</AlertTitle>
            <AlertDescription>
              {failed.map((check) => check.label).join(", ")} failed. Edit the pool or solve
              again.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <Card size="sm">
            <CardHeader className="border-b">
              <CardTitle>Recipe</CardTitle>
              <CardDescription>
                {solverStatus === "optimal"
                  ? solverMessage
                  : "Volumes are live. Properties use the recipe renormalized to 100% if the sum is not exact."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RecipeBar components={blendCase.components} recipe={recipe} />
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric
                  label="Blend cost"
                  value={formatMoney(properties?.costPerBbl)}
                  hint={
                    properties
                      ? `${formatNumber((properties.costPerBbl / gallonsPerBarrel()) * 100, 1)} ¢/gal`
                      : "—"
                  }
                />
                <Metric
                  label="Rack"
                  value={formatMoney(blendCase.rackPricePerBbl)}
                  hint={`${formatNumber(blendCase.rackPricePerBbl / gallonsPerBarrel(), 2)} $/gal`}
                />
                <Metric
                  label="Margin"
                  value={formatMoney(margin)}
                  hint={margin === null ? "—" : margin >= 0 ? "Over rack" : "Under rack"}
                  tone={margin === null ? "muted" : margin >= 0 ? "good" : "bad"}
                />
                <Metric
                  label="Volume sum"
                  value={formatPct(volumePct)}
                  hint={Math.abs(volumePct - 100) < 0.15 ? "Normalized" : "Unnormalized"}
                  tone={Math.abs(volumePct - 100) < 0.15 ? "good" : "warn"}
                />
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Finished spec</CardTitle>
                  <CardDescription>
                    {binding.length > 0
                      ? `Binding now: ${binding.map((check) => check.label).join(", ")}`
                      : "Limits are editable. Slack is giveaway versus the spec."}
                  </CardDescription>
                </div>
                <StatusPill status={solverStatus} failed={failed.length} />
              </div>
            </CardHeader>
            <CardContent>
              <SpecSheet
                checks={checks}
                specs={blendCase.specs}
                onSpecChange={updateSpecs}
                rvpNote={rvpNote}
              />
            </CardContent>
          </Card>
        </div>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>Blendstock pool</CardTitle>
            <CardDescription>
              Typical US streams with blending assays, not tank samples. Toggle a stream
              off, cap availability, or open the assay to change octane, RVP, sulfur, or cost.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlendstockTable
              components={blendCase.components}
              recipe={recipe}
              onVolumeChange={updateVolume}
              onComponentChange={updateComponent}
              onEdit={setEditingId}
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle>How this model starts</CardTitle>
            <CardDescription>
              The right first step is a transparent header, not a 400-row refinery LP.
            </CardDescription>
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

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(next) => next && onChange(String(next))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
    good: "text-emerald-300",
    bad: "text-red-300",
    warn: "text-amber-300",
  }[tone];
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-lg tabular-nums">{value}</dd>
      <p className={`text-[11px] ${hintClass}`}>{hint}</p>
    </div>
  );
}

function StatusPill({ status, failed }: { status: SolverStatus; failed: number }) {
  if (status === "optimal" && failed === 0) {
    return <Badge className="bg-emerald-500/15 text-emerald-300">Optimal</Badge>;
  }
  if (status === "infeasible") {
    return <Badge variant="destructive">Infeasible</Badge>;
  }
  if (failed > 0) {
    return <Badge variant="destructive">Off spec</Badge>;
  }
  return <Badge variant="outline">Manual</Badge>;
}
