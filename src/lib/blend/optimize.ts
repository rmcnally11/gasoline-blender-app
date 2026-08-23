import { componentDiBase } from "./distillation";
import { rvpBlendingIndex } from "./math";
import { blendingAkiOf, blendingMonOf, blendingRonOf, bonsUsedFor } from "./octane";
import { componentsForTank, regionForSlate, regionLabel } from "./regions";
import {
  effectiveRvpLimit,
  emptyMultiRecipe,
  evaluateSpecs,
  failReasons,
  heelContribution,
  newComponentBbl,
  predictMixedProperties,
  recipeFromBarrels,
  tankRvpClass,
  tankWaiverApplied,
} from "./properties";
import { isEthanol, rvoCostCoeff, tankRvoDollars } from "./rvo";
import { solveLinearProgram, type LinearConstraint } from "./simplex";
import type {
  BindingConstraint,
  Blendstock,
  MultiRecipe,
  OptimizeResult,
  Plant,
  PlantSolve,
  ProductTank,
  Recipe,
  RelaxSuggestion,
  TankId,
  TankSolve,
} from "./types";

function ethanolBounds(tank: ProductTank): { min: number; max: number } {
  if (tank.ethanolMode === "e0") return { min: 0, max: 0 };
  if (tank.ethanolMode === "e10") return { min: 0.1, max: 0.1 };
  return { min: 0, max: 0.1 };
}

function idleTankSolve(tank: ProductTank): TankSolve {
  return {
    tankId: tank.id,
    recipe: { volumes: {} },
    barrels: {},
    properties: null,
    cleanBatch: tank.heelBbl <= 0.5,
    mixedFails: false,
    failReasons: [],
    lpRvpLimit: effectiveRvpLimit(tank),
    rvpClassPsi: tankRvpClass(tank),
    waiverApplied: tankWaiverApplied(tank),
    bonsUsed: [],
  };
}

function emptySolve(
  plant: Plant,
  message: string,
  status: PlantSolve["status"],
  extra: Partial<PlantSolve> = {},
): PlantSolve {
  const recipe = emptyMultiRecipe(
    plant.tanks.map((tank) => tank.id),
    plant.components.map((component) => component.id),
  );
  return {
    status,
    message,
    recipe: extra.recipe ?? recipe,
    tanks: extra.tanks ?? plant.tanks.map((tank) => idleTankSolve(tank)),
    componentUsedBbl:
      extra.componentUsedBbl ?? Object.fromEntries(plant.components.map((component) => [component.id, 0])),
    blendCost: extra.blendCost ?? null,
    revenue: extra.revenue ?? null,
    rvoObligation: extra.rvoObligation ?? null,
    rvoCredit: extra.rvoCredit ?? null,
    rvoCost: extra.rvoCost ?? null,
    rvoObligationPerBbl: extra.rvoObligationPerBbl ?? null,
    rvoCreditPerBbl: extra.rvoCreditPerBbl ?? null,
    rvoNetPerBbl: extra.rvoNetPerBbl ?? null,
    freightCost: extra.freightCost ?? null,
    margin: extra.margin ?? null,
    impliedValues: extra.impliedValues ?? {},
    bindingConstraints: extra.bindingConstraints ?? [],
    relaxOptions: extra.relaxOptions ?? [],
    cheapestRelax: extra.cheapestRelax ?? null,
  };
}

function qualityConstraints(tank: ProductTank, comps: Blendstock[], demand: number, prefix: string): LinearConstraint[] {
  const rvpLimit = effectiveRvpLimit(tank);
  const heel = heelContribution(tank.heel, tank.heelBbl);
  const mode = tank.ethanolMode;
  const rows: LinearConstraint[] = [
    {
      name: `${prefix}-aki`,
      coeffs: comps.map((component) => blendingAkiOf(component, mode)),
      sense: ">=",
      rhs: tank.specs.akiMin * demand - heel.aki,
    },
    {
      name: `${prefix}-rvp`,
      coeffs: comps.map((component) => rvpBlendingIndex(component.rvp)),
      sense: "<=",
      rhs: rvpBlendingIndex(rvpLimit) * demand - heel.rvpIndex,
    },
    {
      name: `${prefix}-sulfur`,
      coeffs: comps.map((component) => component.specificGravity * (component.sulfurPpm - tank.specs.sulfurMaxPpm)),
      sense: "<=",
      rhs: -heel.sulfurMassDelta(tank.specs.sulfurMaxPpm),
    },
    {
      name: `${prefix}-benzene`,
      coeffs: comps.map((component) => component.benzeneVolPct),
      sense: "<=",
      rhs: tank.specs.benzeneMaxVolPct * demand - heel.benzene,
    },
    {
      name: `${prefix}-aromatics`,
      coeffs: comps.map((component) => component.aromaticsVolPct),
      sense: "<=",
      rhs: tank.specs.aromaticsMaxVolPct * demand - heel.aromatics,
    },
    {
      name: `${prefix}-olefins`,
      coeffs: comps.map((component) => component.olefinsVolPct),
      sense: "<=",
      rhs: tank.specs.olefinsMaxVolPct * demand - heel.olefins,
    },
    {
      name: `${prefix}-oxygenMax`,
      coeffs: comps.map((component) => component.specificGravity * (component.oxygenWtPct - tank.specs.oxygenMaxWtPct)),
      sense: "<=",
      rhs: -heel.oxygenMassDelta(tank.specs.oxygenMaxWtPct),
    },
  ];

  if (tank.specs.ronMin !== null) {
    rows.push({
      name: `${prefix}-ron`,
      coeffs: comps.map((component) => blendingRonOf(component, mode)),
      sense: ">=",
      rhs: tank.specs.ronMin * demand - heel.ron,
    });
  }
  if (tank.specs.monMin !== null) {
    rows.push({
      name: `${prefix}-mon`,
      coeffs: comps.map((component) => blendingMonOf(component, mode)),
      sense: ">=",
      rhs: tank.specs.monMin * demand - heel.mon,
    });
  }
  if (tank.specs.oxygenMinWtPct !== null) {
    rows.push({
      name: `${prefix}-oxygenMin`,
      coeffs: comps.map((component) => component.specificGravity * (component.oxygenWtPct - tank.specs.oxygenMinWtPct!)),
      sense: ">=",
      rhs: -heel.oxygenMassDelta(tank.specs.oxygenMinWtPct),
    });
  }
  if (tank.specs.t10MaxF !== null) {
    rows.push({
      name: `${prefix}-t10`,
      coeffs: comps.map((component) => component.t10F),
      sense: "<=",
      rhs: tank.specs.t10MaxF * demand - heel.t10,
    });
  }
  if (tank.specs.t50MinF !== null) {
    rows.push({
      name: `${prefix}-t50min`,
      coeffs: comps.map((component) => component.t50F),
      sense: ">=",
      rhs: tank.specs.t50MinF * demand - heel.t50,
    });
  }
  if (tank.specs.t50MaxF !== null) {
    rows.push({
      name: `${prefix}-t50`,
      coeffs: comps.map((component) => component.t50F),
      sense: "<=",
      rhs: tank.specs.t50MaxF * demand - heel.t50,
    });
  }
  if (tank.specs.t90MaxF !== null) {
    rows.push({
      name: `${prefix}-t90`,
      coeffs: comps.map((component) => component.t90F),
      sense: "<=",
      rhs: tank.specs.t90MaxF * demand - heel.t90,
    });
  }
  if (tank.specs.e200MinVolPct !== null) {
    rows.push({
      name: `${prefix}-e200`,
      coeffs: comps.map((component) => component.e200VolPct),
      sense: ">=",
      rhs: tank.specs.e200MinVolPct * demand - heel.e200,
    });
  }
  if (tank.specs.e300MinVolPct !== null) {
    rows.push({
      name: `${prefix}-e300`,
      coeffs: comps.map((component) => component.e300VolPct),
      sense: ">=",
      rhs: tank.specs.e300MinVolPct * demand - heel.e300,
    });
  }
  if (tank.specs.diMax !== null) {
    rows.push({
      name: `${prefix}-di`,
      coeffs: comps.map((component) => componentDiBase(component) + (isEthanol(component) ? 240 : 0)),
      sense: "<=",
      rhs: tank.specs.diMax * demand - heel.diBase,
    });
  }
  return rows;
}

function preflight(plant: Plant, tanks: ProductTank[]): string | null {
  for (const tank of tanks) {
    if (tank.demandBbl > tank.capacityBbl + 1e-6) {
      return `${tank.id}: ship volume ${tank.demandBbl.toFixed(0)} bbl exceeds capacity ${tank.capacityBbl.toFixed(0)} bbl.`;
    }
    if (tank.heelBbl > tank.demandBbl + 1e-6) {
      return `${tank.id}: heel ${tank.heelBbl.toFixed(0)} bbl is larger than the lift ${tank.demandBbl.toFixed(0)} bbl. The mixed tank cannot be smaller than the heel.`;
    }
    if (tank.heelBbl > tank.inventoryBbl + 1e-6) {
      return `${tank.id}: heel ${tank.heelBbl.toFixed(0)} bbl exceeds opening inventory ${tank.inventoryBbl.toFixed(0)} bbl.`;
    }
  }
  return null;
}

type Var = { tank: ProductTank; component: Blendstock };

function buildVars(plant: Plant, tanks: ProductTank[]): { vars: Var[]; error: string | null } {
  const vars: Var[] = [];
  for (const tank of tanks) {
    const comps = componentsForTank(plant.components, tank).filter((component) => component.enabled);
    if (comps.length === 0) {
      return {
        vars,
        error: `No enabled blendstocks in the ${regionLabel(regionForSlate(tank.slateId))} pool for ${tank.id}.`,
      };
    }
    for (const component of comps) {
      vars.push({ tank, component });
    }
  }
  return { vars, error: null };
}

function solveAllocation(plant: Plant): {
  status: PlantSolve["status"];
  message: string;
  vars: Var[];
  x: number[];
  objective: number;
} {
  const tanks = plant.tanks.filter((tank) => tank.enabled && tank.demandBbl > 1e-6);
  if (tanks.length === 0) {
    return { status: "infeasible", message: "Enable a tank and at least one blendstock.", vars: [], x: [], objective: 0 };
  }

  const blocked = preflight(plant, tanks);
  if (blocked) {
    return { status: "infeasible", message: blocked, vars: [], x: [], objective: 0 };
  }

  const built = buildVars(plant, tanks);
  if (built.error) {
    return { status: "infeasible", message: built.error, vars: [], x: [], objective: 0 };
  }
  const vars = built.vars;
  const n = vars.length;

  const costs = vars.map(({ tank, component }) => {
    return component.costPerBbl - tank.rackPricePerBbl + tank.freightPerGal * 42 + rvoCostCoeff(plant.rvo, tank, component);
  });

  const lower = Array.from({ length: n }, () => 0);
  const upper = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i += 1) {
    const { tank, component } = vars[i];
    const mix = tank.demandBbl;
    if (isEthanol(component)) {
      const bounds = ethanolBounds(tank);
      lower[i] = bounds.min * mix;
      upper[i] = Math.min(bounds.max * mix, component.maxLiftBbl, newComponentBbl(tank));
    } else {
      lower[i] = (component.minVolPct / 100) * mix;
      upper[i] = Math.min(component.maxLiftBbl, (component.maxVolPct / 100) * mix, newComponentBbl(tank));
    }
    if (upper[i] + 1e-9 < lower[i]) {
      return {
        status: "infeasible",
        message: `${tank.id}: ${component.name} bounds conflict with heel + ship volume (need ${lower[i].toFixed(0)} bbl, only ${upper[i].toFixed(0)} bbl of room in the mix).`,
        vars,
        x: [],
        objective: 0,
      };
    }
  }

  const constraints: LinearConstraint[] = [];

  for (const tank of tanks) {
    const newBbl = newComponentBbl(tank);
    const coeffs = vars.map((item) => (item.tank.id === tank.id ? 1 : 0));
    constraints.push({ name: `${tank.id}-volume`, coeffs, sense: "=", rhs: newBbl });

    const tankComps = vars.filter((item) => item.tank.id === tank.id).map((item) => item.component);
    const local = qualityConstraints(tank, tankComps, tank.demandBbl, tank.id);
    for (const row of local) {
      const padded = Array.from({ length: n }, () => 0);
      let cursor = 0;
      for (let i = 0; i < n; i += 1) {
        if (vars[i].tank.id !== tank.id) continue;
        padded[i] = row.coeffs[cursor] ?? 0;
        cursor += 1;
      }
      constraints.push({ ...row, coeffs: padded });
    }
  }

  const seen = new Set<string>();
  for (const { component } of vars) {
    if (seen.has(component.id)) continue;
    seen.add(component.id);
    const coeffs = vars.map((item) => (item.component.id === component.id ? 1 : 0));
    constraints.push({
      name: `${component.id}-inventory`,
      coeffs,
      sense: "<=",
      rhs: Math.min(component.inventoryBbl, component.maxLiftBbl),
    });
    if (component.minLiftBbl > 0) {
      constraints.push({
        name: `${component.id}-minlift`,
        coeffs,
        sense: ">=",
        rhs: component.minLiftBbl,
      });
    }
  }

  const result = solveLinearProgram(costs, constraints, lower, upper);
  if (result.status !== "optimal") {
    return {
      status: result.status,
      message:
        result.status === "infeasible"
          ? "No feasible allocation. Each tank only draws from its own regional pool — Colonial, Explorer, West Coast, and Mexico do not share barrels."
          : "The plant LP was unbounded.",
      vars,
      x: result.x,
      objective: result.objective,
    };
  }

  return { status: "optimal", message: "ok", vars, x: result.x, objective: result.objective };
}

const RELAX_PROBES: { name: string; label: string; apply: (plant: Plant) => Plant }[] = [
  {
    name: "aki",
    label: "AKI",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, akiMin: specs.akiMin - 20 })),
  },
  {
    name: "rvp",
    label: "RVP",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, rvpMaxPsi: specs.rvpMaxPsi + 8 })),
  },
  {
    name: "sulfur",
    label: "Sulfur",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, sulfurMaxPpm: specs.sulfurMaxPpm + 400 })),
  },
  {
    name: "benzene",
    label: "Benzene",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, benzeneMaxVolPct: specs.benzeneMaxVolPct + 8 })),
  },
  {
    name: "inventory",
    label: "Component inventory / max lift",
    apply: (plant) => ({
      ...plant,
      components: plant.components.map((component) => ({
        ...component,
        inventoryBbl: component.inventoryBbl + 50_000,
        maxLiftBbl: component.maxLiftBbl + 50_000,
      })),
    }),
  },
  {
    name: "capacity",
    label: "Tank capacity / heel",
    apply: (plant) => ({
      ...plant,
      tanks: plant.tanks.map((tank) => ({
        ...tank,
        capacityBbl: tank.capacityBbl + 50_000,
        inventoryBbl: Math.max(tank.inventoryBbl, tank.heelBbl),
        heelBbl: Math.min(tank.heelBbl, tank.demandBbl),
      })),
    }),
  },
];

const CHEAP_RELAXES: { id: string; label: string; apply: (plant: Plant) => Plant }[] = [
  {
    id: "alk",
    label: "1 bbl alkylate",
    apply: (plant) => ({
      ...plant,
      components: plant.components.map((component) =>
        component.streamKey === "alkylate"
          ? { ...component, inventoryBbl: component.inventoryBbl + 1, maxLiftBbl: component.maxLiftBbl + 1 }
          : component,
      ),
    }),
  },
  {
    id: "aki",
    label: "0.1 AKI",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, akiMin: specs.akiMin - 0.1 })),
  },
  {
    id: "sulfur",
    label: "1 ppm S",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, sulfurMaxPpm: specs.sulfurMaxPpm + 1 })),
  },
  {
    id: "benzene",
    label: "0.01% benzene",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, benzeneMaxVolPct: specs.benzeneMaxVolPct + 0.01 })),
  },
  {
    id: "rvp",
    label: "0.1 psi",
    apply: (plant) => mapTankSpecs(plant, (specs) => ({ ...specs, rvpMaxPsi: specs.rvpMaxPsi + 0.1 })),
  },
];

function mapTankSpecs(plant: Plant, patch: (specs: ProductTank["specs"]) => ProductTank["specs"]): Plant {
  return {
    ...plant,
    tanks: plant.tanks.map((tank) => {
      const specs = patch(tank.specs);
      return {
        ...tank,
        specs,
        pipeSpecs: patch(tank.pipeSpecs),
        finishedSpecs: patch(tank.finishedSpecs),
      };
    }),
  };
}

export function diagnoseInfeasible(plant: Plant): {
  bindingConstraints: BindingConstraint[];
  relaxOptions: RelaxSuggestion[];
  cheapestRelax: RelaxSuggestion | null;
} {
  const bindingConstraints: BindingConstraint[] = [];
  for (const probe of RELAX_PROBES) {
    const trial = solveAllocation(probe.apply(plant));
    if (trial.status === "optimal") {
      bindingConstraints.push({ name: probe.name, label: probe.label });
    }
  }

  const relaxOptions: RelaxSuggestion[] = CHEAP_RELAXES.map((relax) => {
    const trial = solveAllocation(relax.apply(plant));
    return {
      id: relax.id,
      label: relax.label,
      feasible: trial.status === "optimal",
      extraCost: trial.status === "optimal" ? trial.objective : null,
    };
  });

  const working = relaxOptions.filter((item) => item.feasible);
  let cheapestRelax: RelaxSuggestion | null = null;
  for (const item of working) {
    if (cheapestRelax === null || (item.extraCost ?? Infinity) < (cheapestRelax.extraCost ?? Infinity)) {
      cheapestRelax = item;
    }
  }

  return { bindingConstraints, relaxOptions, cheapestRelax };
}

function formatInfeasibleMessage(
  base: string,
  diagnosis: { bindingConstraints: BindingConstraint[]; cheapestRelax: RelaxSuggestion | null; relaxOptions: RelaxSuggestion[] },
): string {
  const binds =
    diagnosis.bindingConstraints.length > 0
      ? ` Binding: ${diagnosis.bindingConstraints.map((item) => item.label).join(", ")}.`
      : " Binding constraints could not be isolated to a single row.";
  const relax = diagnosis.cheapestRelax
    ? ` Cheapest relax that restores a solve: ${diagnosis.cheapestRelax.label}.`
    : diagnosis.relaxOptions.some((item) => item.feasible)
      ? ""
      : " None of 1 bbl alk / 0.1 AKI / 1 ppm S / 0.01% benzene / 0.1 psi restores a solve on its own.";
  return `${base}${binds}${relax}`;
}

export function optimizePlant(plant: Plant, options: { diagnose?: boolean } = {}): PlantSolve {
  const diagnose = options.diagnose !== false;
  const raw = solveAllocation(plant);
  if (raw.status !== "optimal") {
    const diagnosis = diagnose
      ? diagnoseInfeasible(plant)
      : { bindingConstraints: [], relaxOptions: [], cheapestRelax: null };
    return emptySolve(plant, formatInfeasibleMessage(raw.message, diagnosis), raw.status, diagnosis);
  }

  const recipe = emptyMultiRecipe(
    plant.tanks.map((tank) => tank.id),
    plant.components.map((component) => component.id),
  );
  const componentUsedBbl: Record<string, number> = Object.fromEntries(
    plant.components.map((component) => [component.id, 0]),
  );

  for (let i = 0; i < raw.vars.length; i += 1) {
    const barrels = Math.max(0, raw.x[i] ?? 0);
    const { tank, component } = raw.vars[i];
    recipe.barrels[tank.id][component.id] = barrels;
    componentUsedBbl[component.id] += barrels;
  }

  const tankSolves: TankSolve[] = plant.tanks.map((tank) => {
    const barrels = recipe.barrels[tank.id] ?? {};
    const tankRecipe: Recipe = recipeFromBarrels(barrels);
    const pool = componentsForTank(plant.components, tank);
    const properties =
      tank.enabled && tank.demandBbl > 0 ? predictMixedProperties(pool, tankRecipe, tank) : null;
    const checks = evaluateSpecs(tank, properties);
    const fails = failReasons(checks);
    const usedIds = Object.entries(barrels)
      .filter(([, value]) => value > 1e-6)
      .map(([id]) => id);
    return {
      tankId: tank.id,
      recipe: tankRecipe,
      barrels,
      properties,
      cleanBatch: tank.heelBbl <= 0.5,
      mixedFails: fails.length > 0,
      failReasons: fails,
      lpRvpLimit: effectiveRvpLimit(tank),
      rvpClassPsi: tankRvpClass(tank),
      waiverApplied: tankWaiverApplied(tank),
      bonsUsed: bonsUsedFor(pool, tank.ethanolMode, usedIds),
    };
  });

  let blendCost = 0;
  let revenue = 0;
  let freightCost = 0;
  let rvoObligation = 0;
  let rvoCredit = 0;
  let obligatedBbl = 0;
  const tanks = plant.tanks.filter((tank) => tank.enabled && tank.demandBbl > 1e-6);
  for (const tank of tanks) {
    revenue += tank.rackPricePerBbl * tank.demandBbl;
    freightCost += tank.freightPerGal * 42 * tank.demandBbl;
    const pool = componentsForTank(plant.components, tank);
    let ethanolBbl = 0;
    for (const component of pool) {
      const used = recipe.barrels[tank.id][component.id] ?? 0;
      blendCost += used * component.costPerBbl;
      if (isEthanol(component)) ethanolBbl += used;
    }
    const rvo = tankRvoDollars(plant.rvo, tank, tank.demandBbl, ethanolBbl);
    rvoObligation += rvo.obligation;
    rvoCredit += rvo.credit;
    if (rvo.obligation > 0 || rvo.credit > 0) obligatedBbl += tank.demandBbl;
  }
  const rvoCost = rvoObligation - rvoCredit;
  const per = obligatedBbl > 0 ? obligatedBbl : 0;
  return {
    status: "optimal",
    message: "Minimum-cost allocation versus each tank’s destination marker, net of freight. Blend is heel + new components.",
    recipe,
    tanks: tankSolves,
    componentUsedBbl,
    blendCost,
    revenue,
    rvoObligation,
    rvoCredit,
    rvoCost,
    rvoObligationPerBbl: per > 0 ? rvoObligation / per : 0,
    rvoCreditPerBbl: per > 0 ? rvoCredit / per : 0,
    rvoNetPerBbl: per > 0 ? rvoCost / per : 0,
    freightCost,
    margin: revenue - blendCost - rvoCost - freightCost,
    impliedValues: {},
    bindingConstraints: tankSolves.flatMap((tank) =>
      evaluateSpecs(
        plant.tanks.find((item) => item.id === tank.tankId)!,
        tank.properties,
      )
        .filter((check) => check.binding)
        .map((check) => ({ name: `${tank.tankId}-${check.id}`, label: `${tank.tankId} ${check.label}` })),
    ),
    relaxOptions: [],
    cheapestRelax: null,
  };
}

export function emptyRecipe(components: Blendstock[]): Recipe {
  return { volumes: Object.fromEntries(components.map((component) => [component.id, 0])) };
}

/** Single-tank helper used by the original header checks. */
export function optimizeBlendFromPlant(plant: Plant, tankId: TankId = "P1"): OptimizeResult {
  const isolated: Plant = {
    ...plant,
    tanks: plant.tanks.map((tank) => ({
      ...tank,
      enabled: tank.id === tankId,
      demandBbl: tank.id === tankId ? Math.max(tank.demandBbl, 1000) : 0,
    })),
  };
  const result = optimizePlant(isolated, { diagnose: false });
  const tank = result.tanks.find((item) => item.tankId === tankId);
  const source = plant.tanks.find((item) => item.id === tankId);
  const pool = source ? componentsForTank(plant.components, source) : plant.components;
  const recipe = tank?.recipe ?? emptyRecipe(pool);
  const total = Object.values(recipe.volumes).reduce((acc, value) => acc + value, 0);
  const fractions: Recipe = {
    volumes: Object.fromEntries(
      Object.entries(recipe.volumes).map(([id, value]) => [id, total > 0 ? value / total : 0]),
    ),
  };
  return {
    status: result.status,
    recipe: fractions,
    objective: tank?.properties?.costPerBbl ?? null,
    message: result.message,
  };
}

export function cloneRecipe(recipe: MultiRecipe): MultiRecipe {
  const barrels = {} as MultiRecipe["barrels"];
  for (const tankId of Object.keys(recipe.barrels) as TankId[]) {
    barrels[tankId] = { ...recipe.barrels[tankId] };
  }
  return { barrels };
}
