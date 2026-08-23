import { createDefaultCase } from "./defaults";
import { optimizeBlend } from "./optimize";
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
  assert(almost(cheap.objective, 1), `expected obj 1, got ${cheap.objective}`);

  const bounded = solveLinearProgram(
    [3, 1],
    [{ name: "cover", coeffs: [1, 1], sense: ">=", rhs: 1 }],
    [0, 0],
    [0.3, 2],
  );
  assert(bounded.status === "optimal", "expected optimal on cover");
  assert(almost(bounded.x[0], 0) && almost(bounded.x[1], 1), `expected y=1, got ${bounded.x}`);

  const infeasible = solveLinearProgram(
    [1],
    [{ name: "low", coeffs: [1], sense: ">=", rhs: 2 }],
    [0],
    [1],
  );
  assert(infeasible.status === "infeasible", "expected infeasible when min exceeds max");
}

function checkDefaultBlend() {
  const blendCase = createDefaultCase();
  const result = optimizeBlend(blendCase);
  assert(result.status === "optimal", `default summer regular E10 should solve: ${result.message}`);
  const total = Object.values(result.recipe.volumes).reduce((a, b) => a + b, 0);
  assert(almost(total, 1, 1e-3), `recipe should sum to 1, got ${total}`);
  const properties = predictProperties(blendCase.components, result.recipe);
  assert(properties, "expected properties");
  const specs = evaluateSpecs(blendCase, properties);
  const failed = specs.filter((spec) => spec.status === "fail");
  assert(failed.length === 0, `on-spec expected, failed ${failed.map((s) => s.id).join(",")}`);
  assert(properties.aki + 1e-3 >= blendCase.specs.akiMin, `AKI ${properties.aki}`);
  assert(result.recipe.volumes.ethanol > 0.09, "E10 lock should keep ethanol near 10%");
}

function checkWinterButaneAndPremium() {
  const winter = createDefaultCase();
  winter.seasonId = "winter135";
  winter.specs = { ...winter.specs, rvpMaxPsi: 13.5 };
  const winterResult = optimizeBlend(winter);
  assert(winterResult.status === "optimal", "winter regular should solve");
  assert((winterResult.recipe.volumes.nbutane ?? 0) > 0.05, "winter should pull butane");

  const premium = createDefaultCase();
  premium.gradeId = "premium";
  premium.specs = { ...premium.specs, akiMin: 93 };
  const premiumResult = optimizeBlend(premium);
  assert(premiumResult.status === "optimal", "premium should solve");
  assert((premiumResult.recipe.volumes.alkylate ?? 0) > 0.2, "premium should use alkylate");
}

checkSimplex();
checkDefaultBlend();
checkWinterButaneAndPremium();
console.log("blend engine checks passed");
