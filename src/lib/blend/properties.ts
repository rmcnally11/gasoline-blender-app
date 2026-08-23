import { driveabilityIndex } from "./distillation";
import { aki, rvpBlendingIndex, rvpFromBlendingIndex } from "./math";
import { isEthanol } from "./rvo";
import type {
  BlendProperties,
  Blendstock,
  MultiRecipe,
  ProductTank,
  Recipe,
  SpecCheck,
  SpecStatus,
  TankId,
} from "./types";

export function volumeFractions(
  components: Blendstock[],
  recipe: Recipe,
): { fractions: Record<string, number>; total: number } {
  const raw: Record<string, number> = {};
  let total = 0;
  for (const component of components) {
    const volume = Math.max(0, recipe.volumes[component.id] ?? 0);
    raw[component.id] = volume;
    total += volume;
  }
  if (total <= 1e-12) {
    return { fractions: raw, total: 0 };
  }
  const fractions: Record<string, number> = {};
  for (const component of components) {
    fractions[component.id] = raw[component.id] / total;
  }
  return { fractions, total };
}

export function recipeFromBarrels(barrels: Record<string, number>): Recipe {
  return { volumes: { ...barrels } };
}

export function predictProperties(
  components: Blendstock[],
  recipe: Recipe,
): BlendProperties | null {
  const { fractions, total } = volumeFractions(components, recipe);
  if (total <= 1e-12) return null;

  let ron = 0;
  let mon = 0;
  let rvpIndex = 0;
  let specificGravity = 0;
  let sulfurMass = 0;
  let benzene = 0;
  let aromatics = 0;
  let olefins = 0;
  let oxygenMass = 0;
  let t10F = 0;
  let t50F = 0;
  let t90F = 0;
  let e200 = 0;
  let e300 = 0;
  let cost = 0;
  let ethanolVolPct = 0;

  for (const component of components) {
    const x = fractions[component.id] ?? 0;
    if (x <= 0) continue;
    ron += x * component.ron;
    mon += x * component.mon;
    rvpIndex += x * rvpBlendingIndex(component.rvp);
    specificGravity += x * component.specificGravity;
    sulfurMass += x * component.specificGravity * component.sulfurPpm;
    benzene += x * component.benzeneVolPct;
    aromatics += x * component.aromaticsVolPct;
    olefins += x * component.olefinsVolPct;
    oxygenMass += x * component.specificGravity * component.oxygenWtPct;
    t10F += x * component.t10F;
    t50F += x * component.t50F;
    t90F += x * component.t90F;
    e200 += x * component.e200VolPct;
    e300 += x * component.e300VolPct;
    cost += x * component.costPerBbl;
    if (isEthanol(component)) ethanolVolPct = x * 100;
  }

  return {
    volume: total,
    ron,
    mon,
    aki: aki(ron, mon),
    rvp: rvpFromBlendingIndex(rvpIndex),
    specificGravity,
    sulfurPpm: specificGravity > 0 ? sulfurMass / specificGravity : 0,
    benzeneVolPct: benzene,
    aromaticsVolPct: aromatics,
    olefinsVolPct: olefins,
    oxygenWtPct: specificGravity > 0 ? oxygenMass / specificGravity : 0,
    t10F,
    t50F,
    t90F,
    e200VolPct: e200,
    e300VolPct: e300,
    di: driveabilityIndex(t10F, t50F, t90F, ethanolVolPct),
    costPerBbl: cost,
  };
}

function statusFor(
  value: number,
  limit: number | null,
  sense: "min" | "max",
  idle: boolean,
): { status: SpecStatus; slack: number | null; binding: boolean } {
  if (idle || limit === null) {
    return { status: "idle", slack: null, binding: false };
  }
  const slack = sense === "min" ? value - limit : limit - value;
  const status: SpecStatus = slack >= -1e-6 ? "pass" : "fail";
  const band = Math.max(0.05, 0.003 * Math.abs(limit));
  return {
    status,
    slack,
    binding: status === "pass" && slack <= band,
  };
}

export function effectiveRvpLimit(tank: ProductTank): number {
  return tank.specs.rvpMaxPsi + (tank.rvpWaiver ? 1 : 0);
}

export function evaluateSpecs(tank: ProductTank, properties: BlendProperties | null): SpecCheck[] {
  const idle = properties === null;
  const p = properties;
  const rvpLimit = effectiveRvpLimit(tank);
  const s = tank.specs;

  const rows: Array<
    Omit<SpecCheck, "status" | "slack" | "binding"> & {
      value: number;
      limit: number | null;
      sense: "min" | "max";
    }
  > = [
    { id: "aki", label: "(R+M)/2", unit: "AKI", value: p?.aki ?? 0, limit: s.akiMin, sense: "min", blendRule: "Volume-linear blending octane" },
    { id: "ron", label: "RON", unit: "ON", value: p?.ron ?? 0, limit: s.ronMin, sense: "min", blendRule: "Volume-linear blending RON" },
    { id: "mon", label: "MON", unit: "ON", value: p?.mon ?? 0, limit: s.monMin, sense: "min", blendRule: "Volume-linear blending MON" },
    { id: "rvp", label: "RVP", unit: "psi", value: p?.rvp ?? 0, limit: rvpLimit, sense: "max", blendRule: "Chevron index, BI = RVP^1.25" },
    { id: "sulfur", label: "Sulfur", unit: "ppm", value: p?.sulfurPpm ?? 0, limit: s.sulfurMaxPpm, sense: "max", blendRule: "Mass-weighted" },
    { id: "benzene", label: "Benzene", unit: "vol%", value: p?.benzeneVolPct ?? 0, limit: s.benzeneMaxVolPct, sense: "max", blendRule: "Volume-linear" },
    { id: "aromatics", label: "Aromatics", unit: "vol%", value: p?.aromaticsVolPct ?? 0, limit: s.aromaticsMaxVolPct, sense: "max", blendRule: "Volume-linear" },
    { id: "olefins", label: "Olefins", unit: "vol%", value: p?.olefinsVolPct ?? 0, limit: s.olefinsMaxVolPct, sense: "max", blendRule: "Volume-linear" },
    { id: "t10", label: "T10", unit: "°F", value: p?.t10F ?? 0, limit: s.t10MaxF, sense: "max", blendRule: "Volume-linear D86" },
    { id: "t50min", label: "T50 min", unit: "°F", value: p?.t50F ?? 0, limit: s.t50MinF, sense: "min", blendRule: "Volume-linear D86" },
    { id: "t50", label: "T50 max", unit: "°F", value: p?.t50F ?? 0, limit: s.t50MaxF, sense: "max", blendRule: "Volume-linear D86" },
    { id: "t90", label: "T90", unit: "°F", value: p?.t90F ?? 0, limit: s.t90MaxF, sense: "max", blendRule: "Volume-linear D86" },
    { id: "e200", label: "E200", unit: "vol%", value: p?.e200VolPct ?? 0, limit: s.e200MinVolPct, sense: "min", blendRule: "Volume-linear evaporated" },
    { id: "e300", label: "E300", unit: "vol%", value: p?.e300VolPct ?? 0, limit: s.e300MinVolPct, sense: "min", blendRule: "Volume-linear evaporated" },
    { id: "di", label: "Driveability", unit: "DI", value: p?.di ?? 0, limit: s.diMax, sense: "max", blendRule: "1.5 T10 + 3 T50 + T90 + 2.4 EtOH%" },
    { id: "oxygen", label: "Oxygen", unit: "wt%", value: p?.oxygenWtPct ?? 0, limit: s.oxygenMaxWtPct, sense: "max", blendRule: "Mass-weighted" },
  ];

  if (s.oxygenMinWtPct !== null) {
    rows.splice(rows.length - 1, 0, {
      id: "oxygenMin",
      label: "Oxygen (min)",
      unit: "wt%",
      value: p?.oxygenWtPct ?? 0,
      limit: s.oxygenMinWtPct,
      sense: "min",
      blendRule: "Mass-weighted",
    });
  }

  return rows
    .filter((row) => row.limit !== null || row.id === "aki" || row.id === "rvp")
    .map((row) => ({ ...row, ...statusFor(row.value, row.limit, row.sense, idle) }));
}

export function emptyMultiRecipe(tankIds: TankId[], componentIds: string[]): MultiRecipe {
  const barrels = {} as MultiRecipe["barrels"];
  for (const tankId of tankIds) {
    barrels[tankId] = {};
    for (const id of componentIds) barrels[tankId][id] = 0;
  }
  return { barrels };
}

export function tankRecipe(multi: MultiRecipe, tankId: TankId): Recipe {
  return { volumes: { ...(multi.barrels[tankId] ?? {}) } };
}

export function componentUsed(multi: MultiRecipe, componentId: string): number {
  let total = 0;
  for (const tankId of Object.keys(multi.barrels) as TankId[]) {
    total += multi.barrels[tankId]?.[componentId] ?? 0;
  }
  return total;
}
