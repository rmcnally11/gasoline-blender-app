import { aki } from "./math";
import { optimizePlant } from "./optimize";
import { componentsForRegion, regionLabel, tanksOnRegion } from "./regions";
import { rvoCostPerFinishedBbl } from "./rvo";
import type {
  Blendstock,
  ComponentSeekResult,
  NaphthaKind,
  Plant,
  QualityDebit,
  RegionId,
  TankId,
} from "./types";

function withComponentPrice(plant: Plant, componentId: string, price: number, inventoryBbl: number): Plant {
  return {
    ...plant,
    components: plant.components.map((component) =>
      component.id === componentId
        ? { ...component, enabled: true, costPerBbl: price, inventoryBbl, maxLiftBbl: Math.max(component.maxLiftBbl, inventoryBbl) }
        : component,
    ),
  };
}

function usedOf(
  plant: Plant,
  componentId: string,
): { total: number; destination: Partial<Record<TankId, number>> } {
  const solve = optimizePlant(plant);
  const destination: Partial<Record<TankId, number>> = {};
  let total = 0;
  for (const tank of solve.tanks) {
    const used = tank.barrels[componentId] ?? 0;
    if (used > 0.05) {
      destination[tank.tankId] = used;
      total += used;
    }
  }
  return { total, destination };
}

export function impliedComponentValue(plant: Plant, regionId: RegionId, componentId: string): number | null {
  const stream = plant.components.find((component) => component.id === componentId);
  if (!stream || stream.regionId !== regionId) return null;
  if (tanksOnRegion(plant.tanks, regionId).filter((tank) => tank.enabled && tank.demandBbl > 0).length === 0) {
    return null;
  }
  let lo = 0;
  let hi = 250;
  const inventory = Math.max(stream.inventoryBbl, 2500);
  const cheap = withComponentPrice(plant, componentId, lo, inventory);
  if (usedOf(cheap, componentId).total < 0.5) return lo;

  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;
    const trial = withComponentPrice(plant, componentId, mid, inventory);
    if (usedOf(trial, componentId).total > 0.5) lo = mid;
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
      note: `${stream.sulfurPpm.toFixed(0)} ppm vs ${sulfurLimit.toFixed(0)} ppm versus the destination spec.`,
    },
    {
      id: "benzene",
      label: "Benzene",
      amount: Math.max(0, stream.benzeneVolPct - benzeneLimit) * 14,
      note: `${stream.benzeneVolPct.toFixed(2)} vol% vs ${benzeneLimit.toFixed(2)} limit.`,
    },
    {
      id: "rvo",
      label: "RVO",
      amount: rvo,
      note: plant.rvo.enabled
        ? `${(plant.rvo.obligationRate * 100).toFixed(1)}% obligation × $${plant.rvo.d6RinPrice.toFixed(2)} D6. Hydrocarbon adds obligated gallons; ethanol credits RINs.`
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

function emptySeek(
  regionId: RegionId,
  stream: Blendstock | undefined,
  offerPrice: number,
  message: string,
  debits: QualityDebit[] = [],
): ComponentSeekResult {
  return {
    regionId,
    componentId: stream?.id ?? "",
    streamKey: stream?.streamKey ?? "lsr",
    name: stream?.name ?? "Stream",
    kind: stream?.naphtha ?? null,
    offerPrice,
    impliedValue: null,
    clears: false,
    usedBbl: 0,
    destination: {},
    debits,
    message,
  };
}

export function seekComponent(
  plant: Plant,
  regionId: RegionId,
  componentId: string,
  offerPrice: number,
): ComponentSeekResult {
  const stream = plant.components.find((component) => component.id === componentId);
  const label = regionLabel(regionId);
  if (!stream || stream.regionId !== regionId) {
    return emptySeek(regionId, stream, offerPrice, `${label} does not have that stream.`);
  }

  if (tanksOnRegion(plant.tanks, regionId).filter((tank) => tank.enabled && tank.demandBbl > 0).length === 0) {
    return emptySeek(
      regionId,
      stream,
      offerPrice,
      `No destination tank is on ${label}. Point a tank slate at this market before valuing components.`,
      qualityDebits(plant, regionId, stream),
    );
  }

  const impliedValue = impliedComponentValue(plant, regionId, componentId);
  const priced = withComponentPrice(plant, componentId, offerPrice, Math.max(stream.inventoryBbl, 1));
  const usage = usedOf(priced, componentId);
  const clears = impliedValue !== null && offerPrice <= impliedValue + 0.15 && usage.total > 0.05;
  const offerGal = offerPrice / 42;
  const impliedGal = impliedValue === null ? null : impliedValue / 42;

  return {
    regionId,
    componentId: stream.id,
    streamKey: stream.streamKey,
    name: stream.name,
    kind: stream.naphtha,
    offerPrice,
    impliedValue,
    clears,
    usedBbl: usage.total,
    destination: usage.destination,
    debits: qualityDebits(plant, regionId, stream),
    message:
      impliedGal === null
        ? `Could not value ${stream.name} into ${label}.`
        : clears
          ? `Buys. At $${offerGal.toFixed(4)}/gal the header takes ${usage.total.toFixed(0)} bbl of ${stream.name} into ${Object.keys(usage.destination).join(", ") || "the lift"}. Implied value $${impliedGal.toFixed(4)}/gal.`
          : `Does not buy at $${offerGal.toFixed(4)}/gal. Implied value versus the destination is $${impliedGal.toFixed(4)}/gal after quality, RVO, and freight.`,
  };
}

export function seekRegion(plant: Plant, regionId: RegionId): ComponentSeekResult[] {
  return componentsForRegion(plant.components, regionId)
    .filter((component) => component.enabled && component.streamKey !== "ethanol")
    .map((component) => seekComponent(plant, regionId, component.id, component.costPerBbl));
}

function naphthaOf(plant: Plant, regionId: RegionId, kind: Exclude<NaphthaKind, null>): Blendstock | undefined {
  return componentsForRegion(plant.components, regionId).find((component) => component.naphtha === kind);
}

export function seekNaphtha(
  plant: Plant,
  regionId: RegionId,
  kind: Exclude<NaphthaKind, null>,
  offerPrice: number,
): ComponentSeekResult {
  const stream = naphthaOf(plant, regionId, kind);
  if (!stream) {
    return emptySeek(regionId, undefined, offerPrice, `${regionLabel(regionId)} has no ${kind} naphtha in its pool.`);
  }
  return seekComponent(plant, regionId, stream.id, offerPrice);
}
