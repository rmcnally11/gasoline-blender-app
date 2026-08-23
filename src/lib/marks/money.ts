import { evaluateSpecs } from "@/lib/blend/properties";
import { componentsForTank } from "@/lib/blend/regions";
import { isEthanol, tankRvoDollars } from "@/lib/blend/rvo";
import type { Plant, PlantSolve, TankId } from "@/lib/blend/types";
import { liftDecision, type LiftCall } from "./lift";

const MONEY_SPEC_IDS = ["aki", "rvp", "sulfur", "benzene"] as const;

export type MoneyLine = {
  id: string;
  name: string;
  streamKey: string;
  barrels: number;
  bookPerBbl: number;
  impliedPerBbl: number | null;
  bookMinusImplied: number | null;
  call: LiftCall;
  reason: string;
  priceOrigin?: string;
  priceStale?: boolean;
};

export type TankMoney = {
  tankId: TankId;
  name: string;
  finishedBbl: number;
  marksDate: string | null;
  rackPerBbl: number;
  rackLabel: string;
  rackStale: boolean;
  ethanolPerBbl: number | null;
  ethanolStale: boolean;
  d6Cts: number | null;
  d6PerRin: number;
  d6Stale: boolean;
  blendCost: number;
  revenue: number;
  rvoNet: number;
  freight: number;
  margin: number;
  blendCostPerBbl: number | null;
  revenuePerBbl: number | null;
  rvoNetPerBbl: number | null;
  freightPerBbl: number | null;
  marginPerBbl: number | null;
  lines: MoneyLine[];
  bindingLine: string;
};

function perBbl(total: number, barrels: number): number | null {
  return barrels > 0 ? total / barrels : null;
}

function inventoryBinds(plant: Plant, used: Record<string, number>): boolean {
  return plant.components.some((component) => {
    const taken = used[component.id] ?? 0;
    if (taken <= 1e-6) return false;
    return taken >= Math.min(component.inventoryBbl, component.maxLiftBbl) - 0.51;
  });
}

export function bindingLineForTank(plant: Plant, solve: PlantSolve, tankId: TankId): string {
  const tank = plant.tanks.find((item) => item.id === tankId);
  const tankSolve = solve.tanks.find((item) => item.tankId === tankId);
  if (!tank || !tankSolve) return "—";
  const parts: string[] = [];
  const checks = evaluateSpecs(tank, tankSolve.properties);
  for (const id of MONEY_SPEC_IDS) {
    const check = checks.find((item) => item.id === id && (item.binding || item.status === "fail"));
    if (check) parts.push(id === "aki" ? "AKI" : id === "rvp" ? "RVP" : id === "sulfur" ? "S" : "benzene");
  }
  if (inventoryBinds(plant, tankSolve.barrels)) parts.push("inventory");
  const newBbl = Object.values(tankSolve.barrels).reduce((sum, value) => sum + value, 0);
  if (tank.heelBbl + newBbl >= tank.capacityBbl - 0.51) parts.push("capacity");
  return parts.length > 0 ? parts.join(" · ") : "None binding";
}

export function bindingLineForPlant(plant: Plant, solve: PlantSolve): string {
  if (solve.status === "infeasible") {
    const binds = solve.bindingConstraints.map((item) => item.label).join(" · ");
    const relax = solve.cheapestRelax ? ` · cheapest relax: ${solve.cheapestRelax.label}` : "";
    return binds ? `${binds}${relax}` : `Infeasible${relax}`;
  }
  const parts = plant.tanks
    .filter((tank) => tank.enabled)
    .map((tank) => {
      const line = bindingLineForTank(plant, solve, tank.id);
      return line === "None binding" ? null : `${tank.id} ${line}`;
    })
    .filter((item): item is string => Boolean(item));
  return parts.length > 0 ? parts.join(" · ") : "None binding";
}

function linesForUsed(
  plant: Plant,
  used: Record<string, number>,
  impliedValues: Record<string, number | null>,
): MoneyLine[] {
  const epsilon = plant.liftEpsilonPerBbl ?? 0.25;
  return plant.components
    .filter((component) => (used[component.id] ?? 0) > 1e-6)
    .map((component) => {
      const barrels = used[component.id] ?? 0;
      const implied = impliedValues[component.id] ?? null;
      const decision = liftDecision({
        bookPerBbl: component.costPerBbl,
        impliedPerBbl: implied,
        epsilonPerBbl: epsilon,
        priceOrigin: component.priceOrigin,
      });
      return {
        id: component.id,
        name: component.name,
        streamKey: component.streamKey,
        barrels,
        bookPerBbl: component.costPerBbl,
        impliedPerBbl: implied,
        bookMinusImplied: decision.bookMinusImplied,
        call: decision.call,
        reason: decision.reason,
        priceOrigin: component.priceOrigin,
        priceStale: component.priceStale,
      };
    });
}

export function tankMoney(plant: Plant, solve: PlantSolve, tankId: TankId): TankMoney | null {
  const tank = plant.tanks.find((item) => item.id === tankId);
  const tankSolve = solve.tanks.find((item) => item.tankId === tankId);
  if (!tank || !tankSolve) return null;
  const pool = componentsForTank(plant.components, tank);
  let blendCost = 0;
  let ethanolBbl = 0;
  for (const component of pool) {
    const used = tankSolve.barrels[component.id] ?? 0;
    blendCost += used * component.costPerBbl;
    if (isEthanol(component)) ethanolBbl += used;
  }
  const revenue = tank.rackPricePerBbl * tank.demandBbl;
  const freight = tank.freightPerGal * 42 * tank.demandBbl;
  const rvo = tankRvoDollars(plant.rvo, tank, tank.demandBbl, ethanolBbl);
  const margin = revenue - blendCost - rvo.net - freight;
  const finishedBbl = tank.demandBbl;
  const ethanol = plant.components.find((component) => component.streamKey === "ethanol");
  return {
    tankId: tank.id,
    name: tank.name,
    finishedBbl,
    marksDate: plant.marks?.date ?? null,
    rackPerBbl: tank.rackPricePerBbl,
    rackLabel: tank.rackMarksLabel ?? "last typed",
    rackStale: Boolean(tank.rackStale),
    ethanolPerBbl: ethanol?.costPerBbl ?? plant.marks?.ethanolPerBbl ?? null,
    ethanolStale: Boolean(plant.marks?.ethanolStale || ethanol?.priceStale),
    d6Cts: plant.rvo.d6Cts ?? plant.marks?.d6Cts ?? null,
    d6PerRin: plant.rvo.d6RinPrice,
    d6Stale: Boolean(plant.rvo.d6Stale ?? plant.marks?.d6Stale),
    blendCost,
    revenue,
    rvoNet: rvo.net,
    freight,
    margin,
    blendCostPerBbl: perBbl(blendCost, finishedBbl),
    revenuePerBbl: perBbl(revenue, finishedBbl),
    rvoNetPerBbl: perBbl(rvo.net, finishedBbl),
    freightPerBbl: perBbl(freight, finishedBbl),
    marginPerBbl: perBbl(margin, finishedBbl),
    lines: linesForUsed(plant, tankSolve.barrels, solve.impliedValues),
    bindingLine: bindingLineForTank(plant, solve, tank.id),
  };
}

export function plantMoney(plant: Plant, solve: PlantSolve) {
  const finishedBbl = plant.tanks.filter((tank) => tank.enabled).reduce((sum, tank) => sum + tank.demandBbl, 0);
  const tanks = plant.tanks
    .filter((tank) => tank.enabled)
    .map((tank) => tankMoney(plant, solve, tank.id))
    .filter((item): item is TankMoney => item !== null);
  const ethanol = plant.components.find((component) => component.streamKey === "ethanol");
  return {
    marksDate: plant.marks?.date ?? null,
    finishedBbl,
    rackPerBbl: plant.marks?.gcCbobPerBbl ?? null,
    rackStale: Boolean(plant.marks?.gcCbobStale),
    ethanolPerBbl: ethanol?.costPerBbl ?? plant.marks?.ethanolPerBbl ?? null,
    ethanolStale: Boolean(plant.marks?.ethanolStale || ethanol?.priceStale),
    d6Cts: plant.rvo.d6Cts ?? plant.marks?.d6Cts ?? null,
    d6PerRin: plant.rvo.d6RinPrice,
    d6Stale: Boolean(plant.rvo.d6Stale ?? plant.marks?.d6Stale),
    blendCost: solve.blendCost,
    revenue: solve.revenue,
    rvoNet: solve.rvoCost,
    freight: solve.freightCost,
    margin: solve.margin,
    blendCostPerBbl: solve.blendCost === null ? null : perBbl(solve.blendCost, finishedBbl),
    revenuePerBbl: solve.revenue === null ? null : perBbl(solve.revenue, finishedBbl),
    rvoNetPerBbl: solve.rvoCost === null ? null : perBbl(solve.rvoCost, finishedBbl),
    freightPerBbl: solve.freightCost === null ? null : perBbl(solve.freightCost, finishedBbl),
    marginPerBbl: solve.margin === null ? null : perBbl(solve.margin, finishedBbl),
    lines: linesForUsed(plant, solve.componentUsedBbl, solve.impliedValues),
    bindingLine: bindingLineForPlant(plant, solve),
    tanks,
  };
}
