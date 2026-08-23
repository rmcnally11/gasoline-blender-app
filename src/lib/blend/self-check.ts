import { createDefaultPlant } from "./defaults";
import { seekNaphtha } from "./goalseek";
import { optimizeBlendFromPlant, optimizePlant } from "./optimize";
import { evaluateSpecs, predictProperties } from "./properties";
import { solveLinearProgram } from "./simplex";

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

function checkPlant() {
  const plant = createDefaultPlant();
  const result = optimizePlant(plant);
  assert(result.status === "optimal", `default plant should solve: ${result.message}`);
  const p1 = result.tanks.find((tank) => tank.tankId === "P1");
  const p3 = result.tanks.find((tank) => tank.tankId === "P3");
  assert(p1?.properties, "P1 should have properties");
  assert(p3?.properties, "P3 should have properties");
  const p1Fail = evaluateSpecs(plant.tanks[0], p1.properties).filter((spec) => spec.status === "fail");
  const p3Fail = evaluateSpecs(plant.tanks[2], p3.properties).filter((spec) => spec.status === "fail");
  assert(p1Fail.length === 0, `P1 off spec: ${p1Fail.map((spec) => spec.id).join(",")}`);
  assert(p3Fail.length === 0, `P3 off spec: ${p3Fail.map((spec) => spec.id).join(",")}`);
  assert(p1.properties.aki + 1e-3 >= 87, `P1 AKI ${p1.properties.aki}`);
  assert(p3.properties.aki + 1e-3 >= 87, `P3 AKI ${p3.properties.aki}`);
  assert((p1.barrels.ethanol ?? 0) > 700, "P1 E10 should pull ethanol");
  const used = result.componentUsedBbl.fcc ?? 0;
  const fcc = plant.components.find((component) => component.id === "fcc");
  assert(used <= (fcc?.inventoryBbl ?? 0) + 1e-6, "cannot exceed FCC inventory");
}

function checkSingleTankWrapper() {
  const plant = createDefaultPlant();
  const result = optimizeBlendFromPlant(plant, "P1");
  assert(result.status === "optimal", result.message);
  const properties = predictProperties(plant.components, result.recipe);
  assert(properties && properties.aki + 1e-3 >= 87, "wrapper AKI");
}

function checkNaphthaSeek() {
  const plant = createDefaultPlant();
  const cheapLight = seekNaphtha(plant, "light", 40);
  assert(cheapLight.impliedValue !== null, "light naphtha should have a value");
  assert(cheapLight.impliedValue! > 40, `light value too low: ${cheapLight.impliedValue}`);
  assert(cheapLight.clears, cheapLight.message);

  const expensiveHeavy = seekNaphtha(plant, "heavy", 140);
  assert(expensiveHeavy.impliedValue !== null, "heavy naphtha should have a value");
  assert(expensiveHeavy.impliedValue! < 140, `heavy value too high: ${expensiveHeavy.impliedValue}`);
  assert(!expensiveHeavy.clears, expensiveHeavy.message);
  assert(expensiveHeavy.debits.some((debit) => debit.id === "rvo" && debit.amount > 0), "RVO debit missing");
  assert(expensiveHeavy.debits.some((debit) => debit.id === "benzene"), "benzene debit missing");
  assert(expensiveHeavy.debits.some((debit) => debit.id === "sulfur"), "sulfur debit missing");
}

checkSimplex();
checkPlant();
checkSingleTankWrapper();
checkNaphthaSeek();
console.log("blend engine checks passed");
