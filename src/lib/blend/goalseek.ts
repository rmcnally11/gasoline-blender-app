import { aki } from "./math";
import { optimizePlant } from "./optimize";
import { componentsForRegion, regionLabel, tanksOnRegion } from "./regions";
import { rvoCostPerFinishedBbl } from "./rvo";
import type { Blendstock, NaphthaKind, NaphthaSeekResult, Plant, QualityDebit, RegionId, TankId } from "./types";

function naphthaOf(plant: Plant, regionId: RegionId, kind: Exclude<NaphthaKind, null>): Blendstock | undefined {
  return componentsForRegion(plant.components, regionId).find((component) => component.naphtha === kind);
}

function withNaphthaPrice(
  plant: Plant,
  regionId: RegionId,
  kind: Exclude<NaphthaKind, null>,
  price: number,
  inventoryBbl: number,
): Plant {
  return {
    ...plant,
    components: plant.components.map((component) =>
      component.regionId === regionId && component.naphtha === kind
        ? { ...component, enabled: true, costPerBbl: price, inventoryBbl, maxLiftBbl: inventoryBbl }
        : component,
    ),
  };
}

function usedByTank(
  plant: Plant,
  regionId: RegionId,
  kind: Exclude<NaphthaKind, null>,
): { total: number; destination: Partial<Record<TankId, number>> } {
  const stream = naphthaOf(plant, regionId, kind);
  if (!stream) return { total: 0, destination: {} };
  const solve = optimizePlant(plant);
  const destination: Partial<Record<TankId, number>> = {};
  let total = 0;
  for (const tank of solve.tanks) {
    const used = tank.barrels[stream.id] ?? 0;
    if (used > 0.05) {
      destination[tank.tankId] = used;
      total += used;
    }
  }
  return { total, destination };
}

export function impliedNaphthaValue(plant: Plant, regionId: RegionId, kind: Exclude<NaphthaKind, null>): number | null {
  const stream = naphthaOf(plant, regionId, kind);
  if (!stream) return null;
  if (tanksOnRegion(plant.tanks, regionId).filter((tank) => tank.enabled && tank.demandBbl > 0).length === 0) {
    return null;
  }
  let lo = 0;
  let hi = 180;
  const inventory = Math.max(stream.inventoryBbl, 2500);
  const cheap = withNaphthaPrice(plant, regionId, kind, lo, inventory);
  if (usedByTank(cheap, regionId, kind).total < 0.5) return lo;

  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;
    const trial = withNaphthaPrice(plant, regionId, kind, mid, inventory);
    if (usedByTank(trial, regionId, kind).total > 0.5) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function qualityDebits(plant: Plant, regionId: RegionId, stream: Blendstock): QualityDebit[] {
  const regionTanks = tanksOnRegion(plant.tanks, regionId);
  const regular =
    regionTanks.find((tank) => tank.gradeId === "regular" && tank.enabled) ?? regionTanks[0] ?? plant.tanks[0];
  const pool = componentsForRegion(plant.components, regionId);
  const alkylate = pool.find((component) => component.streamKey === "alkylate");
  const fcc = pool.find((component) => component.streamKey === "fcc");
  const akiN = aki(stream.ron, stream.mon);
  const akiSpec = regular?.specs.akiMin ?? 87;
  const octaneValue =
    alkylate && fcc
      ? Math.max(
          0,
          (alkylate.costPerBbl - fcc.costPerBbl) /
            Math.max(0.5, aki(alkylate.ron, alkylate.mon) - aki(fcc.ron, fcc.mon)),
        )
      : 3.5;
  const sulfurLimit = regular?.specs.sulfurMaxPpm ?? 10;
  const benzeneLimit = regular?.specs.benzeneMaxVolPct ?? 0.62;
  const rvo = rvoCostPerFinishedBbl(plant.rvo);
  const diGive = Math.max(0, 1.5 * stream.t10F + 3 * stream.t50F + stream.t90F - (regular?.specs.diMax ?? 1250));

  return [
    {
      id: "octane",
      label: "Octane",
      amount: Math.max(0, akiSpec - akiN) * octaneValue,
      note: `${akiN.toFixed(1)} AKI vs ${akiSpec.toFixed(1)} spec, valued off ${regionLabel(regionId)} alkylate / FCC`,
    },
    {
      id: "sulfur",
      label: "Sulfur",
      amount: Math.max(0, stream.sulfurPpm - sulfurLimit) * 0.18,
      note: `${stream.sulfurPpm.toFixed(0)} ppm vs ${sulfurLimit.toFixed(0)} ppm. High-S naphtha displaces clean blendstocks.`,
    },
    {
      id: "benzene",
      label: "Benzene",
      amount: Math.max(0, stream.benzeneVolPct - benzeneLimit) * 14,
      note: `${stream.benzeneVolPct.toFixed(2)} vol% vs ${benzeneLimit.toFixed(2)} limit. Heavy naphtha is usually benzene-long.`,
    },
    {
      id: "rvo",
      label: "RVO",
      amount: rvo,
      note: plant.rvo.enabled
        ? `${(plant.rvo.obligationRate * 100).toFixed(1)}% obligation × $${plant.rvo.d6RinPrice.toFixed(2)} D6. Naphtha adds obligated gallons and no RINs.`
        : "RVO is off.",
    },
    {
      id: "distillation",
      label: "Distillation / DI",
      amount: diGive * 0.04,
      note: diGive > 0 ? "Heavy tail raises T90 / driveability index versus the slate." : "Front-end / DI is not the binding debit.",
    },
  ];
}

export function seekNaphtha(
  plant: Plant,
  regionId: RegionId,
  kind: Exclude<NaphthaKind, null>,
  offerPrice: number,
): NaphthaSeekResult {
  const stream = naphthaOf(plant, regionId, kind);
  const label = regionLabel(regionId);
  if (!stream) {
    return {
      regionId,
      kind,
      offerPrice,
      impliedValue: null,
      clears: false,
      usedBbl: 0,
      destination: {},
      debits: [],
      message: `${label} has no ${kind} naphtha in its pool.`,
    };
  }

  if (tanksOnRegion(plant.tanks, regionId).filter((tank) => tank.enabled && tank.demandBbl > 0).length === 0) {
    return {
      regionId,
      kind,
      offerPrice,
      impliedValue: null,
      clears: false,
      usedBbl: 0,
      destination: {},
      debits: qualityDebits(plant, regionId, stream),
      message: `No tank is on ${label}. Switch a tank slate to this region before goal-seeking.`,
    };
  }

  const impliedValue = impliedNaphthaValue(plant, regionId, kind);
  const priced = withNaphthaPrice(plant, regionId, kind, offerPrice, Math.max(stream.inventoryBbl, 1));
  const usage = usedByTank(priced, regionId, kind);
  const clears = impliedValue !== null && offerPrice <= impliedValue + 0.15 && usage.total > 0.05;
  const debits = qualityDebits(plant, regionId, stream);

  return {
    regionId,
    kind,
    offerPrice,
    impliedValue,
    clears,
    usedBbl: usage.total,
    destination: usage.destination,
    debits,
    message:
      impliedValue === null
        ? `Could not value ${label} ${kind} naphtha.`
        : clears
          ? `Creates a ${label} domestic barrel. At $${offerPrice.toFixed(2)}/bbl the header takes ${usage.total.toFixed(0)} bbl into ${Object.keys(usage.destination).join(", ") || "the pool"}.`
          : `Does not create a ${label} barrel at $${offerPrice.toFixed(2)}. Implied blend value is $${impliedValue.toFixed(2)}/bbl after sulfur, benzene, octane, DI, and RVO.`,
  };
}
