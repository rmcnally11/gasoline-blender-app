import { evaluateSpecs } from "./properties";
import type { Plant, PlantSolve, SpecCheck, TankId } from "./types";
import { plantMoney, type MoneyLine } from "../marks/money";

const MONEY_SPECS = ["aki", "rvp", "sulfur", "benzene"] as const;
const TANKS: TankId[] = ["P1", "P2", "P3"];

export type BlendBoardStream = {
  id: string;
  name: string;
  shortName: string;
  streamKey: string;
  color: string;
  into: Record<TankId, number>;
  barrels: number;
  volPct: number;
  inventoryBbl: number;
  leftBbl: number;
  bookPerBbl: number;
  impliedPerBbl: number | null;
  bookMinusImplied: number | null;
  call: MoneyLine["call"] | null;
  priceStale?: boolean;
  enabled: boolean;
};

export type BlendBoardQuality = {
  tankId: TankId;
  tankName: string;
  specId: string;
  label: string;
  unit: string;
  value: number | null;
  limit: number | null;
  slack: number | null;
  binding: boolean;
  status: SpecCheck["status"];
};

export type BlendBoardDollars = {
  revenue: number;
  blendCost: number;
  rvoNet: number;
  freight: number;
  margin: number;
  finishedBbl: number;
};

export type BlendBoard = {
  ready: boolean;
  message: string;
  streams: BlendBoardStream[];
  leftover: BlendBoardStream[];
  quality: BlendBoardQuality[];
  dollars: BlendBoardDollars | null;
  recipeVolumes: Record<string, number>;
};

function emptyBoard(message: string): BlendBoard {
  return {
    ready: false,
    message,
    streams: [],
    leftover: [],
    quality: [],
    dollars: null,
    recipeVolumes: {},
  };
}

/**
 * Frozen-recipe view of the plant. Does not re-optimize.
 * Barrels are Solve inventories into P1/P2/P3; dollars follow current marks × those barrels.
 */
export function blendBoard(plant: Plant, solve: PlantSolve): BlendBoard {
  if (solve.status === "idle") {
    return emptyBoard("Press Solve plant. This board is the frozen recipe — barrels, slack, and the dollar stack.");
  }
  if (solve.status === "infeasible") {
    return emptyBoard("No recipe to draw. The plant is infeasible — not a zero blend.");
  }

  const money = plantMoney(plant, solve);
  const lineById = new Map(money.lines.map((line) => [line.id, line]));
  const newBbl = Object.values(solve.componentUsedBbl).reduce((sum, value) => sum + value, 0);

  const rows: BlendBoardStream[] = plant.components.map((component) => {
    const into = {
      P1: solve.recipe.barrels.P1?.[component.id] ?? solve.tanks.find((tank) => tank.tankId === "P1")?.barrels[component.id] ?? 0,
      P2: solve.recipe.barrels.P2?.[component.id] ?? solve.tanks.find((tank) => tank.tankId === "P2")?.barrels[component.id] ?? 0,
      P3: solve.recipe.barrels.P3?.[component.id] ?? solve.tanks.find((tank) => tank.tankId === "P3")?.barrels[component.id] ?? 0,
    };
    const barrels = solve.componentUsedBbl[component.id] ?? into.P1 + into.P2 + into.P3;
    const line = lineById.get(component.id);
    return {
      id: component.id,
      name: component.name,
      shortName: component.shortName,
      streamKey: component.streamKey,
      color: component.color,
      into,
      barrels,
      volPct: newBbl > 0 ? (barrels / newBbl) * 100 : 0,
      inventoryBbl: component.inventoryBbl,
      leftBbl: component.inventoryBbl - barrels,
      bookPerBbl: line?.bookPerBbl ?? component.costPerBbl,
      impliedPerBbl: line?.impliedPerBbl ?? solve.impliedValues[component.id] ?? null,
      bookMinusImplied: line?.bookMinusImplied ?? null,
      call: line?.call ?? null,
      priceStale: line?.priceStale ?? component.priceStale,
      enabled: component.enabled,
    };
  });

  const streams = rows.filter((row) => row.barrels > 1e-6).sort((a, b) => b.barrels - a.barrels);
  const leftover = rows
    .filter((row) => row.barrels <= 1e-6 && row.inventoryBbl > 1e-6 && row.enabled)
    .sort((a, b) => b.inventoryBbl - a.inventoryBbl);

  const quality: BlendBoardQuality[] = [];
  for (const tank of plant.tanks.filter((item) => item.enabled)) {
    const tankSolve = solve.tanks.find((item) => item.tankId === tank.id);
    const checks = evaluateSpecs(tank, tankSolve?.properties ?? null);
    for (const id of MONEY_SPECS) {
      const check = checks.find((item) => item.id === id);
      if (!check) continue;
      quality.push({
        tankId: tank.id,
        tankName: tank.name,
        specId: check.id,
        label: check.label,
        unit: check.unit,
        value: tankSolve?.properties ? check.value : null,
        limit: check.limit,
        slack: check.slack,
        binding: check.binding,
        status: check.status,
      });
    }
  }

  const recipeVolumes = Object.fromEntries(streams.map((row) => [row.id, row.barrels]));

  return {
    ready: true,
    message: money.bindingLine,
    streams,
    leftover,
    quality,
    dollars: {
      revenue: money.revenue,
      blendCost: money.blendCost,
      rvoNet: money.rvoNet,
      freight: money.freight,
      margin: money.margin,
      finishedBbl: money.finishedBbl,
    },
    recipeVolumes,
  };
}

export function tankIds(): TankId[] {
  return TANKS;
}
