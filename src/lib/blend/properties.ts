import { aki, rvpBlendingIndex, rvpFromBlendingIndex } from "./math";
import type {
  BlendCase,
  BlendProperties,
  Blendstock,
  Recipe,
  SpecCheck,
  SpecStatus,
} from "./types";

const BINDING_SLACK = 0.04;

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
  let cost = 0;

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
    cost += x * component.costPerBbl;
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
  return {
    status,
    slack,
    binding: status === "pass" && slack <= BINDING_SLACK,
  };
}

export function effectiveRvpLimit(blendCase: BlendCase): number {
  return blendCase.specs.rvpMaxPsi + (blendCase.rvpWaiver ? 1 : 0);
}

export function evaluateSpecs(
  blendCase: BlendCase,
  properties: BlendProperties | null,
): SpecCheck[] {
  const idle = properties === null;
  const p = properties;
  const rvpLimit = effectiveRvpLimit(blendCase);

  const rows: Array<Omit<SpecCheck, "status" | "slack" | "binding"> & { value: number; limit: number | null; sense: "min" | "max" }> = [
    {
      id: "aki",
      label: "(R+M)/2",
      unit: "AKI",
      value: p?.aki ?? 0,
      limit: blendCase.specs.akiMin,
      sense: "min",
      blendRule: "Volume-linear blending octane",
    },
    {
      id: "ron",
      label: "RON",
      unit: "ON",
      value: p?.ron ?? 0,
      limit: blendCase.specs.ronMin,
      sense: "min",
      blendRule: "Volume-linear blending RON",
    },
    {
      id: "rvp",
      label: "RVP",
      unit: "psi",
      value: p?.rvp ?? 0,
      limit: rvpLimit,
      sense: "max",
      blendRule: "Chevron index, BI = RVP^1.25",
    },
    {
      id: "sulfur",
      label: "Sulfur",
      unit: "ppm",
      value: p?.sulfurPpm ?? 0,
      limit: blendCase.specs.sulfurMaxPpm,
      sense: "max",
      blendRule: "Mass-weighted by specific gravity",
    },
    {
      id: "benzene",
      label: "Benzene",
      unit: "vol%",
      value: p?.benzeneVolPct ?? 0,
      limit: blendCase.specs.benzeneMaxVolPct,
      sense: "max",
      blendRule: "Volume-linear",
    },
    {
      id: "aromatics",
      label: "Aromatics",
      unit: "vol%",
      value: p?.aromaticsVolPct ?? 0,
      limit: blendCase.specs.aromaticsMaxVolPct,
      sense: "max",
      blendRule: "Volume-linear",
    },
    {
      id: "olefins",
      label: "Olefins",
      unit: "vol%",
      value: p?.olefinsVolPct ?? 0,
      limit: blendCase.specs.olefinsMaxVolPct,
      sense: "max",
      blendRule: "Volume-linear",
    },
    {
      id: "oxygen",
      label: "Oxygen",
      unit: "wt%",
      value: p?.oxygenWtPct ?? 0,
      limit: blendCase.specs.oxygenMaxWtPct,
      sense: "max",
      blendRule: "Mass-weighted by specific gravity",
    },
  ];

  if (blendCase.specs.oxygenMinWtPct !== null) {
    rows.splice(7, 0, {
      id: "oxygenMin",
      label: "Oxygen (min)",
      unit: "wt%",
      value: p?.oxygenWtPct ?? 0,
      limit: blendCase.specs.oxygenMinWtPct,
      sense: "min",
      blendRule: "Mass-weighted by specific gravity",
    });
  }

  return rows.map((row) => {
    const judged = statusFor(row.value, row.limit, row.sense, idle);
    return { ...row, ...judged };
  });
}

export function recipeFromPercents(
  components: Blendstock[],
  percents: Record<string, number>,
): Recipe {
  const volumes: Record<string, number> = {};
  for (const component of components) {
    volumes[component.id] = (percents[component.id] ?? 0) / 100;
  }
  return { volumes };
}

export function percentsFromRecipe(
  components: Blendstock[],
  recipe: Recipe,
): Record<string, number> {
  const percents: Record<string, number> = {};
  for (const component of components) {
    percents[component.id] = (recipe.volumes[component.id] ?? 0) * 100;
  }
  return percents;
}
