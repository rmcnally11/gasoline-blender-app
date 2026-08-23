import { aki } from "./math";
import { optimizePlant } from "./optimize";
import { rvoCostPerFinishedBbl } from "./rvo";
import type { Blendstock, NaphthaKind, NaphthaSeekResult, Plant, QualityDebit, TankId } from "./types";

function naphthaOf(plant: Plant, kind: Exclude<NaphthaKind, null>): Blendstock | undefined {
  return plant.components.find((component) => component.naphtha === kind);
}

function withNaphthaPrice(plant: Plant, kind: Exclude<NaphthaKind, null>, price: number, inventoryBbl: number): Plant {
  return {
    ...plant,
    components: plant.components.map((component) =>
      component.naphtha === kind
        ? { ...component, enabled: true, costPerBbl: price, inventoryBbl, maxLiftBbl: inventoryBbl }
        : component,
    ),
  };
}

function usedByTank(plant: Plant, kind: Exclude<NaphthaKind, null>): { total: number; destination: Partial<Record<TankId, number>> } {
  const stream = naphthaOf(plant, kind);
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

export function impliedNaphthaValue(plant: Plant, kind: Exclude<NaphthaKind, null>): number | null {
  const stream = naphthaOf(plant, kind);
  if (!stream) return null;
  let lo = 0;
  let hi = 180;
  const inventory = Math.max(stream.inventoryBbl, 2500);
  const cheap = withNaphthaPrice(plant, kind, lo, inventory);
  if (usedByTank(cheap, kind).total < 0.5) return lo;

  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;
    const trial = withNaphthaPrice(plant, kind, mid, inventory);
    if (usedByTank(trial, kind).total > 0.5) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function qualityDebits(plant: Plant, stream: Blendstock): QualityDebit[] {
  const regular = plant.tanks.find((tank) => tank.gradeId === "regular" && tank.enabled) ?? plant.tanks[0];
  const alkylate = plant.components.find((component) => component.id === "alkylate");
  const fcc = plant.components.find((component) => component.id === "fcc");
  const akiN = aki(stream.ron, stream.mon);
  const akiSpec = regular?.specs.akiMin ?? 87;
  const octaneValue =
    alkylate && fcc
      ? Math.max(0, (alkylate.costPerBbl - fcc.costPerBbl) / Math.max(0.5, aki(alkylate.ron, alkylate.mon) - aki(fcc.ron, fcc.mon)))
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
      note: `${akiN.toFixed(1)} AKI vs ${akiSpec.toFixed(1)} spec, valued off alkylate / FCC`,
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
  kind: Exclude<NaphthaKind, null>,
  offerPrice: number,
): NaphthaSeekResult {
  const stream = naphthaOf(plant, kind);
  if (!stream) {
    return {
      kind,
      offerPrice,
      impliedValue: null,
      clears: false,
      usedBbl: 0,
      destination: {},
      debits: [],
      message: "That naphtha is not in the pool.",
    };
  }

  const impliedValue = impliedNaphthaValue(plant, kind);
  const priced = withNaphthaPrice(plant, kind, offerPrice, Math.max(stream.inventoryBbl, 1));
  const usage = usedByTank(priced, kind);
  const clears = impliedValue !== null && offerPrice <= impliedValue + 0.15 && usage.total > 0.05;
  const debits = qualityDebits(plant, stream);

  return {
    kind,
    offerPrice,
    impliedValue,
    clears,
    usedBbl: usage.total,
    destination: usage.destination,
    debits,
    message:
      impliedValue === null
        ? "Could not value that naphtha."
        : clears
          ? `Creates a domestic barrel. At $${offerPrice.toFixed(2)}/bbl the header takes ${usage.total.toFixed(0)} bbl into ${Object.keys(usage.destination).join(", ") || "the pool"}.`
          : `Does not create a domestic barrel at $${offerPrice.toFixed(2)}. Implied blend value is $${impliedValue.toFixed(2)}/bbl after sulfur, benzene, octane, DI, and RVO.`,
  };
}
