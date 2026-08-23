import { componentDiBase } from "./distillation";
import { aki, rvpBlendingIndex } from "./math";
import { effectiveRvpLimit, emptyMultiRecipe, predictProperties, recipeFromBarrels } from "./properties";
import { isEthanol, rinCreditPerEthanolBbl, rvoCostPerFinishedBbl, rvoNetCost } from "./rvo";
import { solveLinearProgram, type LinearConstraint } from "./simplex";
import type {
  Blendstock,
  MultiRecipe,
  OptimizeResult,
  Plant,
  PlantSolve,
  ProductTank,
  Recipe,
  TankId,
  TankSolve,
} from "./types";

function ethanolBounds(tank: ProductTank): { min: number; max: number } {
  if (tank.ethanolMode === "e0") return { min: 0, max: 0 };
  if (tank.ethanolMode === "e10") return { min: 0.1, max: 0.1 };
  return { min: 0, max: 0.1 };
}

function emptySolve(plant: Plant, message: string, status: PlantSolve["status"]): PlantSolve {
  const recipe = emptyMultiRecipe(
    plant.tanks.map((tank) => tank.id),
    plant.components.map((component) => component.id),
  );
  return {
    status,
    message,
    recipe,
    tanks: plant.tanks.map((tank) => ({
      tankId: tank.id,
      recipe: { volumes: {} },
      barrels: {},
      properties: null,
    })),
    componentUsedBbl: Object.fromEntries(plant.components.map((component) => [component.id, 0])),
    blendCost: null,
    revenue: null,
    rvoCost: null,
    margin: null,
  };
}

function qualityConstraints(tank: ProductTank, comps: Blendstock[], demand: number, prefix: string): LinearConstraint[] {
  const rvpLimit = effectiveRvpLimit(tank);
  const rows: LinearConstraint[] = [
    {
      name: `${prefix}-aki`,
      coeffs: comps.map((component) => aki(component.ron, component.mon)),
      sense: ">=",
      rhs: tank.specs.akiMin * demand,
    },
    {
      name: `${prefix}-rvp`,
      coeffs: comps.map((component) => rvpBlendingIndex(component.rvp)),
      sense: "<=",
      rhs: rvpBlendingIndex(rvpLimit) * demand,
    },
    {
      name: `${prefix}-sulfur`,
      coeffs: comps.map((component) => component.specificGravity * (component.sulfurPpm - tank.specs.sulfurMaxPpm)),
      sense: "<=",
      rhs: 0,
    },
    {
      name: `${prefix}-benzene`,
      coeffs: comps.map((component) => component.benzeneVolPct),
      sense: "<=",
      rhs: tank.specs.benzeneMaxVolPct * demand,
    },
    {
      name: `${prefix}-aromatics`,
      coeffs: comps.map((component) => component.aromaticsVolPct),
      sense: "<=",
      rhs: tank.specs.aromaticsMaxVolPct * demand,
    },
    {
      name: `${prefix}-olefins`,
      coeffs: comps.map((component) => component.olefinsVolPct),
      sense: "<=",
      rhs: tank.specs.olefinsMaxVolPct * demand,
    },
    {
      name: `${prefix}-oxygenMax`,
      coeffs: comps.map((component) => component.specificGravity * (component.oxygenWtPct - tank.specs.oxygenMaxWtPct)),
      sense: "<=",
      rhs: 0,
    },
  ];

  if (tank.specs.ronMin !== null) {
    rows.push({
      name: `${prefix}-ron`,
      coeffs: comps.map((component) => component.ron),
      sense: ">=",
      rhs: tank.specs.ronMin * demand,
    });
  }
  if (tank.specs.monMin !== null) {
    rows.push({
      name: `${prefix}-mon`,
      coeffs: comps.map((component) => component.mon),
      sense: ">=",
      rhs: tank.specs.monMin * demand,
    });
  }
  if (tank.specs.oxygenMinWtPct !== null) {
    rows.push({
      name: `${prefix}-oxygenMin`,
      coeffs: comps.map((component) => component.specificGravity * (component.oxygenWtPct - tank.specs.oxygenMinWtPct!)),
      sense: ">=",
      rhs: 0,
    });
  }
  if (tank.specs.t10MaxF !== null) {
    rows.push({
      name: `${prefix}-t10`,
      coeffs: comps.map((component) => component.t10F),
      sense: "<=",
      rhs: tank.specs.t10MaxF * demand,
    });
  }
  if (tank.specs.t50MinF !== null) {
    rows.push({
      name: `${prefix}-t50min`,
      coeffs: comps.map((component) => component.t50F),
      sense: ">=",
      rhs: tank.specs.t50MinF * demand,
    });
  }
  if (tank.specs.t50MaxF !== null) {
    rows.push({
      name: `${prefix}-t50`,
      coeffs: comps.map((component) => component.t50F),
      sense: "<=",
      rhs: tank.specs.t50MaxF * demand,
    });
  }
  if (tank.specs.t90MaxF !== null) {
    rows.push({
      name: `${prefix}-t90`,
      coeffs: comps.map((component) => component.t90F),
      sense: "<=",
      rhs: tank.specs.t90MaxF * demand,
    });
  }
  if (tank.specs.e200MinVolPct !== null) {
    rows.push({
      name: `${prefix}-e200`,
      coeffs: comps.map((component) => component.e200VolPct),
      sense: ">=",
      rhs: tank.specs.e200MinVolPct * demand,
    });
  }
  if (tank.specs.e300MinVolPct !== null) {
    rows.push({
      name: `${prefix}-e300`,
      coeffs: comps.map((component) => component.e300VolPct),
      sense: ">=",
      rhs: tank.specs.e300MinVolPct * demand,
    });
  }
  if (tank.specs.diMax !== null) {
    rows.push({
      name: `${prefix}-di`,
      coeffs: comps.map((component) => componentDiBase(component) + (isEthanol(component) ? 240 : 0)),
      sense: "<=",
      rhs: tank.specs.diMax * demand,
    });
  }
  return rows;
}

export function optimizePlant(plant: Plant): PlantSolve {
  const tanks = plant.tanks.filter((tank) => tank.enabled && tank.demandBbl > 1e-6);
  const comps = plant.components.filter((component) => component.enabled);
  if (tanks.length === 0 || comps.length === 0) {
    return emptySolve(plant, "Enable a tank and at least one blendstock.", "infeasible");
  }

  const nT = tanks.length;
  const nC = comps.length;
  const n = nT * nC;
  const rvoPerBbl = rvoCostPerFinishedBbl(plant.rvo);
  const ethanolCredit = rinCreditPerEthanolBbl(plant.rvo);

  const costs = Array.from({ length: n }, (_, index) => {
    const tank = tanks[Math.floor(index / nC)];
    const component = comps[index % nC];
    let cost = component.costPerBbl - tank.rackPricePerBbl + rvoPerBbl;
    if (isEthanol(component)) cost -= ethanolCredit;
    return cost;
  });

  const lower = Array.from({ length: n }, () => 0);
  const upper = Array.from({ length: n }, (_, index) => {
    const tank = tanks[Math.floor(index / nC)];
    const component = comps[index % nC];
    if (isEthanol(component)) {
      return ethanolBounds(tank).max * tank.demandBbl;
    }
    return Math.min(component.maxLiftBbl, (component.maxVolPct / 100) * tank.demandBbl, tank.demandBbl);
  });

  for (let t = 0; t < nT; t += 1) {
    const tank = tanks[t];
    const etoh = comps.findIndex((component) => isEthanol(component));
    if (etoh >= 0) {
      lower[t * nC + etoh] = ethanolBounds(tank).min * tank.demandBbl;
    }
    for (let c = 0; c < nC; c += 1) {
      const component = comps[c];
      if (isEthanol(component)) continue;
      lower[t * nC + c] = (component.minVolPct / 100) * tank.demandBbl;
    }
  }

  const constraints: LinearConstraint[] = [];

  for (let t = 0; t < nT; t += 1) {
    const tank = tanks[t];
    const coeffs = Array.from({ length: n }, (_, index) => (Math.floor(index / nC) === t ? 1 : 0));
    constraints.push({ name: `${tank.id}-volume`, coeffs, sense: "=", rhs: tank.demandBbl });

    const local = qualityConstraints(tank, comps, tank.demandBbl, tank.id);
    for (const row of local) {
      const padded = Array.from({ length: n }, () => 0);
      for (let c = 0; c < nC; c += 1) padded[t * nC + c] = row.coeffs[c] ?? 0;
      constraints.push({ ...row, coeffs: padded });
    }
  }

  for (let c = 0; c < nC; c += 1) {
    const component = comps[c];
    const coeffs = Array.from({ length: n }, (_, index) => (index % nC === c ? 1 : 0));
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
    return emptySolve(
      plant,
      result.status === "infeasible"
        ? "No feasible allocation across P1/P2/P3 with the current inventories, ethanol locks, and spec slates."
        : "The plant LP was unbounded.",
      result.status,
    );
  }

  const recipe = emptyMultiRecipe(
    plant.tanks.map((tank) => tank.id),
    plant.components.map((component) => component.id),
  );
  const componentUsedBbl: Record<string, number> = Object.fromEntries(
    plant.components.map((component) => [component.id, 0]),
  );

  for (let t = 0; t < nT; t += 1) {
    for (let c = 0; c < nC; c += 1) {
      const barrels = Math.max(0, result.x[t * nC + c] ?? 0);
      recipe.barrels[tanks[t].id][comps[c].id] = barrels;
      componentUsedBbl[comps[c].id] += barrels;
    }
  }

  const tankSolves: TankSolve[] = plant.tanks.map((tank) => {
    const barrels = recipe.barrels[tank.id] ?? {};
    const tankRecipe: Recipe = recipeFromBarrels(barrels);
    return {
      tankId: tank.id,
      recipe: tankRecipe,
      barrels,
      properties: tank.enabled && tank.demandBbl > 0 ? predictProperties(plant.components, tankRecipe) : null,
    };
  });

  let blendCost = 0;
  let revenue = 0;
  let ethanolBbl = 0;
  let finishedBbl = 0;
  for (const tank of tanks) {
    finishedBbl += tank.demandBbl;
    revenue += tank.rackPricePerBbl * tank.demandBbl;
    for (const component of comps) {
      const used = recipe.barrels[tank.id][component.id] ?? 0;
      blendCost += used * component.costPerBbl;
      if (isEthanol(component)) ethanolBbl += used;
    }
  }
  const rvoCost = rvoNetCost(plant.rvo, finishedBbl, ethanolBbl);
  return {
    status: "optimal",
    message: "Minimum-cost allocation of the shared pool into P1, P2, and P3.",
    recipe,
    tanks: tankSolves,
    componentUsedBbl,
    blendCost,
    revenue,
    rvoCost,
    margin: revenue - blendCost - rvoCost,
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
  const result = optimizePlant(isolated);
  const tank = result.tanks.find((item) => item.tankId === tankId);
  const recipe = tank?.recipe ?? emptyRecipe(plant.components);
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
