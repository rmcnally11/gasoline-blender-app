import { blendingAkiOf } from "./octane";
import { optimizePlant } from "./optimize";
import { componentsForRegion, regionLabel, tanksOnRegion } from "./regions";
import { rvoAppliesToTank, tankRvoDollars } from "./rvo";
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
  const solve = optimizePlant(plant, { diagnose: false });
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

/**
 * LP indifference price: the most the destination header can pay for this stream
 * and still take it. Same plant LP the header solve uses — not the heuristic debit card.
 */
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

function heuristicQualityCard(plant: Plant, regionId: RegionId, stream: Blendstock): QualityDebit[] {
  const regionTanks = tanksOnRegion(plant.tanks, regionId);
  const regular =
    regionTanks.find((tank) => tank.gradeId === "regular" && tank.enabled) ?? regionTanks[0] ?? plant.tanks[0];
  const pool = componentsForRegion(plant.components, regionId);
  const alkylate = pool.find((component) => component.streamKey === "alkylate");
  const fcc = pool.find((component) => component.streamKey === "fcc");
  const mode = regular?.ethanolMode ?? "e10";
  const akiN = blendingAkiOf(stream, mode);
  const akiSpec = regular?.specs.akiMin ?? 87;
  const octaneValue =
    alkylate && fcc
      ? Math.max(
          0,
          (alkylate.costPerBbl - fcc.costPerBbl) /
            Math.max(0.5, blendingAkiOf(alkylate, mode) - blendingAkiOf(fcc, mode)),
        )
      : 3.5;
  const sulfurLimit = regular?.specs.sulfurMaxPpm ?? 80;
  const benzeneLimit = regular?.specs.benzeneMaxVolPct ?? 3.8;
  const sample = regular
    ? tankRvoDollars(plant.rvo, regular, 1, 0)
    : { obligation: 0, credit: 0, net: 0 };
  const diGive = Math.max(0, 1.5 * stream.t10F + 3 * stream.t50F + stream.t90F - (regular?.specs.diMax ?? 1250));

  return [
    {
      id: "octane",
      label: "Octane (heuristic)",
      amount: Math.max(0, akiSpec - akiN) * octaneValue,
      note: `${akiN.toFixed(1)} BON AKI vs ${akiSpec.toFixed(1)} spec, valued off ${regionLabel(regionId)} alkylate / FCC. Not the bid.`,
      heuristic: true,
    },
    {
      id: "sulfur",
      label: "Sulfur (heuristic)",
      amount: Math.max(0, stream.sulfurPpm - sulfurLimit) * 0.18,
      note: `${stream.sulfurPpm.toFixed(0)} ppm vs ${sulfurLimit.toFixed(0)} ppm. Heuristic giveaway, not the LP dual.`,
      heuristic: true,
    },
    {
      id: "benzene",
      label: "Benzene (heuristic)",
      amount: Math.max(0, stream.benzeneVolPct - benzeneLimit) * 14,
      note: `${stream.benzeneVolPct.toFixed(2)} vol% vs ${benzeneLimit.toFixed(2)} limit. Heuristic, not the bid.`,
      heuristic: true,
    },
    {
      id: "rvo",
      label: "RVO (heuristic)",
      amount: sample.obligation,
      note: regular && rvoAppliesToTank(plant.rvo, regular)
        ? `${(plant.rvo.obligationRate * 100).toFixed(1)}% on hydrocarbon gallons × $${plant.rvo.d6RinPrice.toFixed(2)} D6. Export / Mexico tanks are not charged. Heuristic card — the bid is the LP implied value.`
        : "RVO is off for this destination (disabled or Mexico/export).",
      heuristic: true,
    },
    {
      id: "distillation",
      label: "Distillation / DI (heuristic)",
      amount: diGive * 0.04,
      note: diGive > 0
        ? "Volume-linear D86 / DI approximation. Heuristic giveaway, not a V/L or CaRFG3 check."
        : "Front-end / DI is not the binding heuristic debit.",
      heuristic: true,
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
    impliedSource: "lp",
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
      heuristicQualityCard(plant, regionId, stream),
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
    impliedSource: "lp",
    clears,
    usedBbl: usage.total,
    destination: usage.destination,
    debits: heuristicQualityCard(plant, regionId, stream),
    message:
      impliedGal === null
        ? `Could not value ${stream.name} into ${label}.`
        : clears
          ? `Buys. At $${offerGal.toFixed(4)}/gal the header takes ${usage.total.toFixed(0)} bbl of ${stream.name} into ${Object.keys(usage.destination).join(", ") || "the lift"}. LP implied value $${impliedGal.toFixed(4)}/gal (same plant LP as the header).`
          : `Does not buy at $${offerGal.toFixed(4)}/gal. LP implied value versus the destination is $${impliedGal.toFixed(4)}/gal — same dual / indifference as the header, not the heuristic debit card.`,
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
