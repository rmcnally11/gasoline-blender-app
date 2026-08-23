import { aki, rvpBlendingIndex } from "./math";
import { effectiveRvpLimit, predictProperties } from "./properties";
import { solveLinearProgram, type LinearConstraint } from "./simplex";
import type { BlendCase, OptimizeResult, Recipe } from "./types";

export function emptyRecipe(blendCase: BlendCase): Recipe {
  const volumes: Record<string, number> = {};
  for (const component of blendCase.components) {
    volumes[component.id] = 0;
  }
  return { volumes };
}

export function optimizeBlend(blendCase: BlendCase): OptimizeResult {
  const active = blendCase.components.filter((component) => component.enabled);
  if (active.length === 0) {
    return {
      status: "infeasible",
      recipe: emptyRecipe(blendCase),
      objective: null,
      message: "Enable at least one blendstock.",
    };
  }

  const costs = active.map((component) => component.costPerBbl);
  const lower = active.map((component) => component.minVolPct / 100);
  const upper = active.map((component) => component.maxVolPct / 100);
  const rvpLimit = effectiveRvpLimit(blendCase);
  const rvpIndexLimit = rvpBlendingIndex(rvpLimit);

  const constraints: LinearConstraint[] = [
    {
      name: "volume",
      coeffs: active.map(() => 1),
      sense: "=",
      rhs: 1,
    },
    {
      name: "aki",
      coeffs: active.map((component) => aki(component.ron, component.mon)),
      sense: ">=",
      rhs: blendCase.specs.akiMin,
    },
    {
      name: "rvp",
      coeffs: active.map((component) => rvpBlendingIndex(component.rvp)),
      sense: "<=",
      rhs: rvpIndexLimit,
    },
    {
      name: "sulfur",
      coeffs: active.map(
        (component) => component.specificGravity * (component.sulfurPpm - blendCase.specs.sulfurMaxPpm),
      ),
      sense: "<=",
      rhs: 0,
    },
    {
      name: "benzene",
      coeffs: active.map((component) => component.benzeneVolPct),
      sense: "<=",
      rhs: blendCase.specs.benzeneMaxVolPct,
    },
    {
      name: "aromatics",
      coeffs: active.map((component) => component.aromaticsVolPct),
      sense: "<=",
      rhs: blendCase.specs.aromaticsMaxVolPct,
    },
    {
      name: "olefins",
      coeffs: active.map((component) => component.olefinsVolPct),
      sense: "<=",
      rhs: blendCase.specs.olefinsMaxVolPct,
    },
    {
      name: "oxygenMax",
      coeffs: active.map(
        (component) => component.specificGravity * (component.oxygenWtPct - blendCase.specs.oxygenMaxWtPct),
      ),
      sense: "<=",
      rhs: 0,
    },
  ];

  if (blendCase.specs.ronMin !== null) {
    constraints.push({
      name: "ron",
      coeffs: active.map((component) => component.ron),
      sense: ">=",
      rhs: blendCase.specs.ronMin,
    });
  }

  if (blendCase.specs.oxygenMinWtPct !== null) {
    constraints.push({
      name: "oxygenMin",
      coeffs: active.map(
        (component) => component.specificGravity * (component.oxygenWtPct - blendCase.specs.oxygenMinWtPct!),
      ),
      sense: ">=",
      rhs: 0,
    });
  }

  const result = solveLinearProgram(costs, constraints, lower, upper);
  const recipe = emptyRecipe(blendCase);

  if (result.status !== "optimal") {
    return {
      status: result.status,
      recipe,
      objective: null,
      message:
        result.status === "infeasible"
          ? "No feasible recipe with the current specs, availability, and ethanol lock. Relax a binding limit or raise a cheap high-octane max."
          : "The blend LP was unbounded, which usually means a bound is missing.",
    };
  }

  for (let i = 0; i < active.length; i += 1) {
    recipe.volumes[active[i].id] = Math.max(0, result.x[i]);
  }

  const properties = predictProperties(blendCase.components, recipe);
  return {
    status: "optimal",
    recipe,
    objective: properties?.costPerBbl ?? result.objective,
    message: "Minimum-cost recipe that meets the finished-gasoline specs.",
  };
}
