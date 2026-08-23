import { driveabilityIndex } from "./distillation";
import { rvpBlendingIndex, rvpFromBlendingIndex } from "./math";
import { blendingAkiOf, blendingMonOf, blendingRonOf, heelAki } from "./octane";
import { isEthanol } from "./rvo";
import {
  finishedRvpLimit,
  lpRvpLimitFor,
  pipeRvpLimit,
  rvpClassPsi,
  waiverApplies,
} from "./specs";
import type {
  BlendProperties,
  Blendstock,
  HeelQuality,
  MultiRecipe,
  ProductSpecs,
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

export function newComponentBbl(tank: Pick<ProductTank, "demandBbl" | "heelBbl">): number {
  return Math.max(0, tank.demandBbl - tank.heelBbl);
}

function accumulate(
  ron: number,
  mon: number,
  rvp: number,
  specificGravity: number,
  sulfurPpm: number,
  benzeneVolPct: number,
  aromaticsVolPct: number,
  olefinsVolPct: number,
  oxygenWtPct: number,
  t10F: number,
  t50F: number,
  t90F: number,
  e200VolPct: number,
  e300VolPct: number,
  costPerBbl: number,
  ethanolVol: number,
  volume: number,
  acc: {
    ron: number;
    mon: number;
    rvpIndex: number;
    specificGravity: number;
    sulfurMass: number;
    benzene: number;
    aromatics: number;
    olefins: number;
    oxygenMass: number;
    t10F: number;
    t50F: number;
    t90F: number;
    e200: number;
    e300: number;
    cost: number;
    ethanolVol: number;
  },
) {
  if (volume <= 0) return;
  acc.ron += volume * ron;
  acc.mon += volume * mon;
  acc.rvpIndex += volume * rvpBlendingIndex(rvp);
  acc.specificGravity += volume * specificGravity;
  acc.sulfurMass += volume * specificGravity * sulfurPpm;
  acc.benzene += volume * benzeneVolPct;
  acc.aromatics += volume * aromaticsVolPct;
  acc.olefins += volume * olefinsVolPct;
  acc.oxygenMass += volume * specificGravity * oxygenWtPct;
  acc.t10F += volume * t10F;
  acc.t50F += volume * t50F;
  acc.t90F += volume * t90F;
  acc.e200 += volume * e200VolPct;
  acc.e300 += volume * e300VolPct;
  acc.cost += volume * costPerBbl;
  acc.ethanolVol += ethanolVol;
}

function finishProperties(
  acc: {
    ron: number;
    mon: number;
    rvpIndex: number;
    specificGravity: number;
    sulfurMass: number;
    benzene: number;
    aromatics: number;
    olefins: number;
    oxygenMass: number;
    t10F: number;
    t50F: number;
    t90F: number;
    e200: number;
    e300: number;
    cost: number;
    ethanolVol: number;
  },
  total: number,
): BlendProperties {
  const ron = acc.ron / total;
  const mon = acc.mon / total;
  const specificGravity = acc.specificGravity / total;
  const ethanolVolPct = (acc.ethanolVol / total) * 100;
  return {
    volume: total,
    ron,
    mon,
    aki: (ron + mon) / 2,
    rvp: rvpFromBlendingIndex(acc.rvpIndex / total),
    specificGravity,
    sulfurPpm: specificGravity > 0 ? acc.sulfurMass / acc.specificGravity : 0,
    benzeneVolPct: acc.benzene / total,
    aromaticsVolPct: acc.aromatics / total,
    olefinsVolPct: acc.olefins / total,
    oxygenWtPct: specificGravity > 0 ? acc.oxygenMass / acc.specificGravity : 0,
    t10F: acc.t10F / total,
    t50F: acc.t50F / total,
    t90F: acc.t90F / total,
    e200VolPct: acc.e200 / total,
    e300VolPct: acc.e300 / total,
    di: driveabilityIndex(acc.t10F / total, acc.t50F / total, acc.t90F / total, ethanolVolPct),
    costPerBbl: acc.cost / total,
    ethanolVolPct,
  };
}

export function predictProperties(
  components: Blendstock[],
  recipe: Recipe,
  ethanolMode: ProductTank["ethanolMode"] = "e10",
): BlendProperties | null {
  const acc = emptyAcc();
  let total = 0;
  for (const component of components) {
    const volume = Math.max(0, recipe.volumes[component.id] ?? 0);
    if (volume <= 0) continue;
    total += volume;
    accumulate(
      blendingRonOf(component, ethanolMode),
      blendingMonOf(component, ethanolMode),
      component.rvp,
      component.specificGravity,
      component.sulfurPpm,
      component.benzeneVolPct,
      component.aromaticsVolPct,
      component.olefinsVolPct,
      component.oxygenWtPct,
      component.t10F,
      component.t50F,
      component.t90F,
      component.e200VolPct,
      component.e300VolPct,
      component.costPerBbl,
      isEthanol(component) ? volume : 0,
      volume,
      acc,
    );
  }
  if (total <= 1e-12) return null;
  return finishProperties(acc, total);
}

export function predictMixedProperties(
  components: Blendstock[],
  newRecipe: Recipe,
  tank: ProductTank,
): BlendProperties | null {
  const acc = emptyAcc();
  let total = 0;
  if (tank.heelBbl > 1e-9) {
    total += tank.heelBbl;
    accumulate(
      tank.heel.ron,
      tank.heel.mon,
      tank.heel.rvp,
      tank.heel.specificGravity,
      tank.heel.sulfurPpm,
      tank.heel.benzeneVolPct,
      tank.heel.aromaticsVolPct,
      tank.heel.olefinsVolPct,
      tank.heel.oxygenWtPct,
      tank.heel.t10F,
      tank.heel.t50F,
      tank.heel.t90F,
      tank.heel.e200VolPct,
      tank.heel.e300VolPct,
      0,
      0,
      tank.heelBbl,
      acc,
    );
  }
  for (const component of components) {
    const volume = Math.max(0, newRecipe.volumes[component.id] ?? 0);
    if (volume <= 0) continue;
    total += volume;
    accumulate(
      blendingRonOf(component, tank.ethanolMode),
      blendingMonOf(component, tank.ethanolMode),
      component.rvp,
      component.specificGravity,
      component.sulfurPpm,
      component.benzeneVolPct,
      component.aromaticsVolPct,
      component.olefinsVolPct,
      component.oxygenWtPct,
      component.t10F,
      component.t50F,
      component.t90F,
      component.e200VolPct,
      component.e300VolPct,
      component.costPerBbl,
      isEthanol(component) ? volume : 0,
      volume,
      acc,
    );
  }
  if (total <= 1e-12) return null;
  return finishProperties(acc, total);
}

function emptyAcc() {
  return {
    ron: 0,
    mon: 0,
    rvpIndex: 0,
    specificGravity: 0,
    sulfurMass: 0,
    benzene: 0,
    aromatics: 0,
    olefins: 0,
    oxygenMass: 0,
    t10F: 0,
    t50F: 0,
    t90F: 0,
    e200: 0,
    e300: 0,
    cost: 0,
    ethanolVol: 0,
  };
}

function statusFor(
  value: number,
  limit: number | null,
  sense: "min" | "max",
  idle: boolean,
  cleanBatch: boolean,
): { status: SpecStatus; slack: number | null; binding: boolean } {
  if (idle || limit === null) {
    return { status: "idle", slack: null, binding: false };
  }
  const slack = sense === "min" ? value - limit : limit - value;
  if (slack < -1e-6) {
    return { status: "fail", slack, binding: false };
  }
  const band = Math.max(0.05, 0.003 * Math.abs(limit));
  const binding = slack <= band;
  if (cleanBatch) {
    return { status: "batch", slack, binding: false };
  }
  return { status: "pass", slack, binding };
}

export function effectiveRvpLimit(tank: ProductTank): number {
  return lpRvpLimitFor(tank);
}

export function pipeRvpFor(tank: Pick<ProductTank, "slateId" | "seasonId">): number {
  return pipeRvpLimit(tank.slateId, tank.seasonId);
}

export function finishedRvpFor(tank: Pick<ProductTank, "slateId" | "seasonId" | "ethanolMode" | "rvpWaiver">): number {
  return finishedRvpLimit(tank.slateId, tank.seasonId, tank.ethanolMode, tank.rvpWaiver);
}

export function tankWaiverApplied(tank: Pick<ProductTank, "slateId" | "seasonId" | "ethanolMode" | "rvpWaiver">): boolean {
  return waiverApplies(tank.slateId, tank.seasonId, tank.ethanolMode, tank.rvpWaiver);
}

export function tankRvpClass(tank: Pick<ProductTank, "slateId" | "seasonId">): number {
  return rvpClassPsi(tank.slateId, tank.seasonId);
}

const DIST_APPROX = "Volume-linear D86 approximation — not a real T50/T90 blend";

export function evaluateSpecs(tank: ProductTank, properties: BlendProperties | null): SpecCheck[] {
  const idle = properties === null;
  const cleanBatch = tank.heelBbl <= 0.5;
  const p = properties;
  const lp = tank.specs;
  const pipe = tank.pipeSpecs;
  const finished = tank.finishedSpecs;
  const rvpLimit = effectiveRvpLimit(tank);

  const rows: Array<
    Omit<SpecCheck, "status" | "slack" | "binding"> & {
      value: number;
      limit: number | null;
      sense: "min" | "max";
    }
  > = [
    {
      id: "aki",
      label: "(R+M)/2",
      unit: "AKI",
      value: p?.aki ?? 0,
      limit: lp.akiMin,
      pipeLimit: pipe.akiMin,
      finishedLimit: finished.akiMin,
      sense: "min",
      blendRule: "Blending octane numbers (BON), not neat RON/MON as mass",
      layer: "pipe",
    },
    {
      id: "ron",
      label: "RON",
      unit: "ON",
      value: p?.ron ?? 0,
      limit: lp.ronMin,
      pipeLimit: pipe.ronMin,
      finishedLimit: finished.ronMin,
      sense: "min",
      blendRule: "Volume-linear blending RON (BON)",
      layer: "pipe",
    },
    {
      id: "mon",
      label: "MON",
      unit: "ON",
      value: p?.mon ?? 0,
      limit: lp.monMin,
      pipeLimit: pipe.monMin,
      finishedLimit: finished.monMin,
      sense: "min",
      blendRule: "Volume-linear blending MON (BON)",
      layer: "pipe",
    },
    {
      id: "rvp",
      label: "RVP",
      unit: "psi",
      value: p?.rvp ?? 0,
      limit: rvpLimit,
      pipeLimit: pipe.rvpMaxPsi,
      finishedLimit: finished.rvpMaxPsi,
      sense: "max",
      blendRule: "Chevron index, BI = RVP^1.25. CBOB class ≠ finished E10.",
      layer: "pipe",
    },
    {
      id: "sulfur",
      label: "Sulfur",
      unit: "ppm",
      value: p?.sulfurPpm ?? 0,
      limit: lp.sulfurMaxPpm,
      pipeLimit: pipe.sulfurMaxPpm,
      finishedLimit: finished.sulfurMaxPpm,
      sense: "max",
      blendRule: "Mass-weighted",
      layer: "pipe",
    },
    {
      id: "benzene",
      label: "Benzene",
      unit: "vol%",
      value: p?.benzeneVolPct ?? 0,
      limit: lp.benzeneMaxVolPct,
      pipeLimit: pipe.benzeneMaxVolPct,
      finishedLimit: finished.benzeneMaxVolPct,
      sense: "max",
      blendRule: "Volume-linear",
      layer: "pipe",
    },
    {
      id: "aromatics",
      label: "Aromatics",
      unit: "vol%",
      value: p?.aromaticsVolPct ?? 0,
      limit: lp.aromaticsMaxVolPct,
      pipeLimit: pipe.aromaticsMaxVolPct,
      finishedLimit: finished.aromaticsMaxVolPct,
      sense: "max",
      blendRule: "Volume-linear",
      layer: "pipe",
    },
    {
      id: "olefins",
      label: "Olefins",
      unit: "vol%",
      value: p?.olefinsVolPct ?? 0,
      limit: lp.olefinsMaxVolPct,
      pipeLimit: pipe.olefinsMaxVolPct,
      finishedLimit: finished.olefinsMaxVolPct,
      sense: "max",
      blendRule: "Volume-linear",
      layer: "pipe",
    },
    {
      id: "t10",
      label: "T10",
      unit: "°F",
      value: p?.t10F ?? 0,
      limit: lp.t10MaxF,
      pipeLimit: pipe.t10MaxF,
      finishedLimit: finished.t10MaxF,
      sense: "max",
      blendRule: DIST_APPROX,
      layer: "pipe",
    },
    {
      id: "t50min",
      label: "T50 min",
      unit: "°F",
      value: p?.t50F ?? 0,
      limit: lp.t50MinF,
      pipeLimit: pipe.t50MinF,
      finishedLimit: finished.t50MinF,
      sense: "min",
      blendRule: DIST_APPROX,
      layer: "pipe",
    },
    {
      id: "t50",
      label: "T50 max",
      unit: "°F",
      value: p?.t50F ?? 0,
      limit: lp.t50MaxF,
      pipeLimit: pipe.t50MaxF,
      finishedLimit: finished.t50MaxF,
      sense: "max",
      blendRule: DIST_APPROX,
      layer: "pipe",
    },
    {
      id: "t90",
      label: "T90",
      unit: "°F",
      value: p?.t90F ?? 0,
      limit: lp.t90MaxF,
      pipeLimit: pipe.t90MaxF,
      finishedLimit: finished.t90MaxF,
      sense: "max",
      blendRule: DIST_APPROX,
      layer: "pipe",
    },
    {
      id: "e200",
      label: "E200",
      unit: "vol%",
      value: p?.e200VolPct ?? 0,
      limit: lp.e200MinVolPct,
      pipeLimit: pipe.e200MinVolPct,
      finishedLimit: finished.e200MinVolPct,
      sense: "min",
      blendRule: "Volume-linear evaporated approximation",
      layer: "pipe",
    },
    {
      id: "e300",
      label: "E300",
      unit: "vol%",
      value: p?.e300VolPct ?? 0,
      limit: lp.e300MinVolPct,
      pipeLimit: pipe.e300MinVolPct,
      finishedLimit: finished.e300MinVolPct,
      sense: "min",
      blendRule: "Volume-linear evaporated approximation",
      layer: "pipe",
    },
    {
      id: "di",
      label: "Driveability",
      unit: "DI",
      value: p?.di ?? 0,
      limit: lp.diMax,
      pipeLimit: pipe.diMax,
      finishedLimit: finished.diMax,
      sense: "max",
      blendRule: "1.5 T10 + 3 T50 + T90 + 2.4 EtOH% on volume-linear D86",
      layer: "pipe",
    },
    {
      id: "oxygen",
      label: "Oxygen",
      unit: "wt%",
      value: p?.oxygenWtPct ?? 0,
      limit: lp.oxygenMaxWtPct,
      pipeLimit: pipe.oxygenMaxWtPct,
      finishedLimit: finished.oxygenMaxWtPct,
      sense: "max",
      blendRule: "Mass-weighted",
      layer: "finished",
    },
  ];

  if (lp.oxygenMinWtPct !== null || finished.oxygenMinWtPct !== null) {
    rows.splice(rows.length - 1, 0, {
      id: "oxygenMin",
      label: "Oxygen (min)",
      unit: "wt%",
      value: p?.oxygenWtPct ?? 0,
      limit: lp.oxygenMinWtPct,
      pipeLimit: pipe.oxygenMinWtPct,
      finishedLimit: finished.oxygenMinWtPct,
      sense: "min",
      blendRule: "Mass-weighted. Finished E10 only — not a CBOB receipt spec.",
      layer: "finished",
    });
  }

  return rows
    .filter((row) => row.limit !== null || row.pipeLimit !== null || row.finishedLimit !== null || row.id === "aki" || row.id === "rvp")
    .map((row) => ({ ...row, ...statusFor(row.value, row.limit, row.sense, idle, cleanBatch) }));
}

export function failReasons(checks: SpecCheck[]): string[] {
  return checks.filter((check) => check.status === "fail").map((check) => check.label);
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

export function heelContribution(heel: HeelQuality, heelBbl: number) {
  return {
    aki: heelBbl * heelAki(heel),
    ron: heelBbl * heel.ron,
    mon: heelBbl * heel.mon,
    rvpIndex: heelBbl * rvpBlendingIndex(heel.rvp),
    sulfurMassDelta: (limit: number) => heelBbl * heel.specificGravity * (heel.sulfurPpm - limit),
    benzene: heelBbl * heel.benzeneVolPct,
    aromatics: heelBbl * heel.aromaticsVolPct,
    olefins: heelBbl * heel.olefinsVolPct,
    oxygenMassDelta: (limit: number) => heelBbl * heel.specificGravity * (heel.oxygenWtPct - limit),
    t10: heelBbl * heel.t10F,
    t50: heelBbl * heel.t50F,
    t90: heelBbl * heel.t90F,
    e200: heelBbl * heel.e200VolPct,
    e300: heelBbl * heel.e300VolPct,
    diBase: heelBbl * (1.5 * heel.t10F + 3.0 * heel.t50F + heel.t90F),
  };
}

export function overlayDoesNotTouchPipe(pipe: ProductSpecs, overlayOn: boolean): boolean {
  void overlayOn;
  return pipe.sulfurMaxPpm === 80 || pipe.sulfurMaxPpm === 20 || pipe.sulfurMaxPpm === 30;
}
