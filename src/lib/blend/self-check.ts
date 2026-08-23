import { createDefaultPlant, refreshTankSpecs } from "./defaults";
import { seekNaphtha } from "./goalseek";
import { optimizeBlendFromPlant, optimizePlant } from "./optimize";
import { evaluateSpecs, predictProperties } from "./properties";
import { componentsForTank, regionForSlate } from "./regions";
import { defaultEthanolMode } from "./specs";
import { solveLinearProgram } from "./simplex";
import type { Plant, SlateId } from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function almost(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) <= eps;
}

function checkSimplex() {
  const cheap = solveLinearProgram([1, 2], [{ name: "sum", coeffs: [1, 1], sense: "=", rhs: 1 }], [0, 0], [1, 1]);
  assert(cheap.status === "optimal", "expected optimal on unit simplex");
  assert(almost(cheap.x[0], 1) && almost(cheap.x[1], 0), `expected all cheap component, got ${cheap.x}`);
}

function usedIds(barrels: Record<string, number>): string[] {
  return Object.entries(barrels)
    .filter(([, value]) => value > 1e-6)
    .map(([id]) => id);
}

function checkPlant() {
  const plant = createDefaultPlant();
  const result = optimizePlant(plant);
  assert(result.status === "optimal", `default plant should solve: ${result.message}`);
  const p1 = result.tanks.find((tank) => tank.tankId === "P1");
  const p2 = result.tanks.find((tank) => tank.tankId === "P2");
  const p3 = result.tanks.find((tank) => tank.tankId === "P3");
  assert(p1?.properties, "P1 should have properties");
  assert(p2?.properties, "P2 should have properties");
  assert(p3?.properties, "P3 should have properties");
  const p1Fail = evaluateSpecs(plant.tanks[0], p1.properties).filter((spec) => spec.status === "fail");
  const p2Fail = evaluateSpecs(plant.tanks[1], p2.properties).filter((spec) => spec.status === "fail");
  const p3Fail = evaluateSpecs(plant.tanks[2], p3.properties).filter((spec) => spec.status === "fail");
  assert(p1Fail.length === 0, `P1 off spec: ${p1Fail.map((spec) => spec.id).join(",")}`);
  assert(p2Fail.length === 0, `P2 off spec: ${p2Fail.map((spec) => spec.id).join(",")}`);
  assert(p3Fail.length === 0, `P3 off spec: ${p3Fail.map((spec) => spec.id).join(",")}`);
  assert(p1.properties.aki + 1e-3 >= 87, `P1 AKI ${p1.properties.aki}`);
  assert(p3.properties.aki + 1e-3 >= 87, `P3 AKI ${p3.properties.aki}`);
  assert((p1.barrels["colonial-ethanol"] ?? 0) > 700, "P1 E10 should pull Colonial ethanol");
  assert((p2.barrels["explorer-ethanol"] ?? 0) > 100, "P2 E10 should pull Explorer ethanol");

  for (const id of usedIds(p1.barrels)) {
    assert(id.startsWith("colonial-"), `P1 took ${id} from another region`);
  }
  for (const id of usedIds(p2.barrels)) {
    assert(id.startsWith("explorer-"), `P2 took ${id} from another region`);
  }
  for (const id of usedIds(p3.barrels)) {
    assert(id.startsWith("colonial-"), `P3 took ${id} from another region`);
  }

  const colonialFcc = plant.components.find((component) => component.id === "colonial-fcc");
  const explorerFcc = plant.components.find((component) => component.id === "explorer-fcc");
  assert((result.componentUsedBbl["colonial-fcc"] ?? 0) <= (colonialFcc?.inventoryBbl ?? 0) + 1e-6, "Colonial FCC inventory");
  assert((result.componentUsedBbl["explorer-fcc"] ?? 0) <= (explorerFcc?.inventoryBbl ?? 0) + 1e-6, "Explorer FCC inventory");
  assert((p1.barrels["explorer-fcc"] ?? 0) < 1e-6, "P1 cannot lift Explorer FCC");
}

function checkSingleTankWrapper() {
  const plant = createDefaultPlant();
  const result = optimizeBlendFromPlant(plant, "P1");
  assert(result.status === "optimal", result.message);
  const pool = componentsForTank(plant.components, plant.tanks[0]);
  const properties = predictProperties(pool, result.recipe);
  assert(properties && properties.aki + 1e-3 >= 87, "wrapper AKI");
}

function withSlate(plant: Plant, tankId: "P1" | "P2" | "P3", slateId: SlateId): Plant {
  return {
    ...plant,
    tanks: plant.tanks.map((tank) =>
      tank.id === tankId
        ? refreshTankSpecs(
            { ...tank, slateId, ethanolMode: defaultEthanolMode(slateId), demandBbl: 1800 },
            plant.complianceOverlay,
          )
        : tank,
    ),
  };
}

function checkOtherRegionPools() {
  const base = createDefaultPlant();
  const west = optimizePlant(withSlate(base, "P3", "sfpp-carbob"));
  assert(west.status === "optimal", `West Coast tank should solve: ${west.message}`);
  const p3w = west.tanks.find((tank) => tank.tankId === "P3");
  assert(p3w?.properties, "SFPP tank properties");
  const westFail = evaluateSpecs(
    west.status === "optimal" ? withSlate(base, "P3", "sfpp-carbob").tanks[2] : base.tanks[2],
    p3w.properties,
  ).filter((spec) => spec.status === "fail");
  assert(westFail.length === 0, `SFPP off spec: ${westFail.map((spec) => spec.id).join(",")}`);
  for (const id of usedIds(p3w.barrels)) {
    assert(id.startsWith("west-coast-"), `SFPP tank took ${id}`);
  }

  const mexicoPlant = withSlate(base, "P3", "mexico-zmvm");
  const mexico = optimizePlant(mexicoPlant);
  assert(mexico.status === "optimal", `Mexico tank should solve: ${mexico.message}`);
  const p3m = mexico.tanks.find((tank) => tank.tankId === "P3");
  assert(p3m?.properties, "Mexico tank properties");
  const mexicoFail = evaluateSpecs(mexicoPlant.tanks[2], p3m.properties).filter((spec) => spec.status === "fail");
  assert(mexicoFail.length === 0, `Mexico off spec: ${mexicoFail.map((spec) => spec.id).join(",")}`);
  for (const id of usedIds(p3m.barrels)) {
    assert(id.startsWith("mexico-"), `Mexico tank took ${id}`);
  }
  assert(regionForSlate("mexico-resto") === "mexico", "resto shares Mexico pool");
}

function checkNaphthaSeek() {
  const plant = createDefaultPlant();
  const cheapLight = seekNaphtha(plant, "colonial", "light", 40);
  assert(cheapLight.impliedValue !== null, "Colonial light naphtha should have a value");
  assert(cheapLight.impliedValue! > 40, `light value too low: ${cheapLight.impliedValue}`);
  assert(cheapLight.clears, cheapLight.message);

  const expensiveHeavy = seekNaphtha(plant, "colonial", "heavy", 140);
  assert(expensiveHeavy.impliedValue !== null, "Colonial heavy naphtha should have a value");
  assert(expensiveHeavy.impliedValue! < 140, `heavy value too high: ${expensiveHeavy.impliedValue}`);
  assert(!expensiveHeavy.clears, expensiveHeavy.message);
  assert(expensiveHeavy.debits.some((debit) => debit.id === "rvo" && debit.amount > 0), "RVO debit missing");
  assert(expensiveHeavy.debits.some((debit) => debit.id === "benzene"), "benzene debit missing");
  assert(expensiveHeavy.debits.some((debit) => debit.id === "sulfur"), "sulfur debit missing");

  const explorerSeek = seekNaphtha(plant, "explorer", "light", 40);
  assert(explorerSeek.impliedValue !== null, "Explorer light naphtha should have a value");
  assert(explorerSeek.clears, explorerSeek.message);

  const idleWest = seekNaphtha(plant, "west-coast", "light", 70);
  assert(idleWest.impliedValue === null, "West Coast seek needs a tank on SFPP");
}

checkSimplex();
checkPlant();
checkSingleTankWrapper();
checkOtherRegionPools();
checkNaphthaSeek();
console.log("blend engine checks passed");
