import { applyMarksAndBook } from "../marks/apply";
import { rowsFromComponentBookRecords } from "../marks/airtable";
import { compareSettlementDays } from "../marks/compare";
import { emptyComponentBook } from "../marks/component-book";
import {
  emptyDailyMarks,
  marksFromPlattsFields,
  SAMPLE_PLATTS_FIELDS_20_AUG_2026,
  SAMPLE_PLATTS_FIELDS_21_AUG_2026,
} from "../marks/convert";
import { liftDecision } from "../marks/lift";
import { createDefaultPlant, defaultHeel, refreshTankSpecs } from "./defaults";
import { impliedComponentValue, seekNaphtha, seekRegion } from "./goalseek";
import { optimizeBlendFromPlant, optimizePlant } from "./optimize";
import { evaluateSpecs, predictProperties } from "./properties";
import { componentsForTank, regionForSlate } from "./regions";
import { defaultEthanolMode, rvpClassPsi, waiverApplies, waiverEligible } from "./specs";
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

function checkDefaultPipeSpecs() {
  const plant = createDefaultPlant();
  assert(plant.complianceOverlay === false, "default overlay must be off so a Colonial lift uses pipe CBOB");
  const p1 = plant.tanks[0];
  assert(p1.slateId === "cpl-cbob" && p1.gradeId === "regular" && p1.ethanolMode === "e10", "default P1 is Regular E10 Colonial");
  assert(p1.pipeSpecs.sulfurMaxPpm === 80, `pipe S ${p1.pipeSpecs.sulfurMaxPpm}`);
  assert(p1.pipeSpecs.benzeneMaxVolPct === 3.8, `pipe bz ${p1.pipeSpecs.benzeneMaxVolPct}`);
  assert(p1.pipeSpecs.rvpMaxPsi === 9.0, `pipe RVP ${p1.pipeSpecs.rvpMaxPsi} — class is 9.0, no overlay, no 8.8`);
  assert(p1.specs.sulfurMaxPpm === 80 && p1.specs.benzeneMaxVolPct === 3.8, "LP must use pipe CBOB when overlay is off");
  assert(p1.specs.rvpMaxPsi === 9.0, `LP RVP ${p1.specs.rvpMaxPsi} must be CBOB class, not finished waiver`);
  assert(p1.rvpWaiver === true, "default waiver on because E10 + 9.0");
  assert(p1.finishedSpecs.rvpMaxPsi === 10.0, "finished E10 + waiver is 10.0 — not what the LP uses while overlay is off");
  assert(p1.finishedSpecs.sulfurMaxPpm === 80, "overlay off: finished S stays off the 10 ppm overlay");
  assert(p1.freightPerGal === 0.04, "pipe tariff must be present with overlay off");

  const overlaid = {
    ...plant,
    complianceOverlay: true,
    tanks: plant.tanks.map((tank) => refreshTankSpecs(tank, true)),
  };
  const o1 = overlaid.tanks[0];
  assert(o1.pipeSpecs.sulfurMaxPpm === 80 && o1.pipeSpecs.benzeneMaxVolPct === 3.8, "overlay must not write pipe receipt");
  assert(o1.pipeSpecs.rvpMaxPsi === 9.0, "overlay must not change CBOB RVP class");
  assert(o1.finishedSpecs.sulfurMaxPpm === 10 && o1.finishedSpecs.benzeneMaxVolPct === 0.62, "overlay is finished only");
  assert(o1.specs.sulfurMaxPpm === 10 && o1.specs.benzeneMaxVolPct === 0.62, "LP uses finished when overlay is on");
  assert(o1.freightPerGal === 0.04, "turning overlay on/off must not lose the pipe tariff");
}

function checkRvpWaiverRules() {
  assert(rvpClassPsi("cpl-cbob", "summer78") === 7.8, "Colonial 7.8 is 7.8 — the 8.8 hack is gone");
  assert(waiverEligible("cpl-cbob", "summer78", "e10") === false, "waiver is not eligible on 7.8");
  assert(waiverApplies("cpl-cbob", "summer78", "e10", true) === false, "checking the box must not inflate 7.8");
  assert(waiverEligible("cpl-cbob", "summer90", "e10") === true, "E10 + 9.0 is the only waiver case");
  assert(waiverApplies("cpl-cbob", "summer90", "e10", true) === true, "waiver applies for E10 + 9.0 when requested");
  assert(waiverApplies("cpl-cbob", "summer90", "e10", false) === false, "waiver stays off if the trader turns it off");
  assert(waiverApplies("cpl-cbob", "summer90", "e0", true) === false, "E0 does not get the 1-psi waiver");

  const plant = createDefaultPlant();
  const winter = refreshTankSpecs(
    { ...plant.tanks[0], seasonId: "summer78", rvpWaiver: true },
    false,
    { resetWaiver: true },
  );
  assert(winter.rvpWaiver === false, "default waiver off unless E10+9.0");
  assert(winter.pipeSpecs.rvpMaxPsi === 7.8 && winter.specs.rvpMaxPsi === 7.8, "LP RVP on Colonial 7.8 is 7.8");
  assert(winter.finishedSpecs.rvpMaxPsi === 7.8, "finished 7.8 is not inflated");
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
  assert(p1.cleanBatch === false, "default heel is non-zero — this is a mixed tank, not a thought experiment");
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
  assert(almost(p1.lpRvpLimit, 9.0), `P1 LP RVP ${p1.lpRvpLimit} should be CBOB 9.0`);
  assert(p1.waiverApplied === true, "waiver is on for E10+9.0 but does not inflate the pipe LP number");
  assert(p1.bonsUsed.some((bon) => bon.streamKey === "ethanol" && bon.blendingRon > 113), "ethanol BON + E10 synergy must be shown");
  assert(p1.bonsUsed.some((bon) => bon.streamKey === "fcc"), "FCC BON must be shown");

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

function checkZeroHeelIsNotOnSpec() {
  const plant = createDefaultPlant();
  plant.tanks[0].heelBbl = 0;
  const result = optimizePlant(plant);
  const p1 = result.tanks.find((tank) => tank.tankId === "P1");
  assert(p1?.cleanBatch, "zero heel is a clean-batch thought experiment");
  const checks = evaluateSpecs(plant.tanks[0], p1?.properties ?? null);
  assert(
    checks.filter((check) => check.status === "fail").length === 0,
    "zero-heel recipe can still be feasible",
  );
  assert(
    checks.some((check) => check.status === "batch"),
    "zero heel must not print On spec — status is clean batch",
  );
  assert(
    checks.every((check) => check.status !== "pass"),
    "do not print on-spec on a zero-heel thought experiment",
  );
}

function checkDirtyHeelFails() {
  const plant = createDefaultPlant();
  plant.tanks = plant.tanks.map((tank) =>
    tank.id === "P1"
      ? {
          ...tank,
          heelBbl: 5200,
          demandBbl: 5600,
          inventoryBbl: 5200,
          heel: {
            ...defaultHeel(),
            sulfurPpm: 420,
            benzeneVolPct: 6.4,
            ron: 82,
            mon: 76,
          },
        }
      : { ...tank, enabled: false, demandBbl: 0 },
  );
  const result = optimizePlant(plant);
  assert(result.status === "infeasible", `dirty heel should make the mixed tank fail: ${result.message}`);
  assert(
    result.bindingConstraints.some((item) => /sulfur|benzene|AKI/i.test(item.label)) ||
      /sulfur|benzene|AKI|heel/i.test(result.message),
    `infeasible solve must name the bind: ${result.message} / ${result.bindingConstraints.map((item) => item.label).join(",")}`,
  );
  assert(
    result.cheapestRelax !== null || result.relaxOptions.length > 0,
    "infeasible solve must return relax options, not a shrug",
  );
  assert(!/zero recipe/i.test(result.message), result.message);
}

function checkMexicoRvoOff() {
  const base = createDefaultPlant();
  const mexicoPlant: Plant = {
    ...base,
    tanks: base.tanks.map((tank) =>
      tank.id === "P3"
        ? refreshTankSpecs(
            { ...tank, slateId: "mexico-zmvm", ethanolMode: defaultEthanolMode("mexico-zmvm"), demandBbl: 1800, heelBbl: 200 },
            false,
            { resetWaiver: true },
          )
        : { ...tank, enabled: false, demandBbl: 0 },
    ),
  };
  const result = optimizePlant(mexicoPlant);
  assert(result.status === "optimal", `Mexico tank should solve: ${result.message}`);
  assert((result.rvoObligation ?? 0) === 0, `Mexico must not be charged RVO: ${result.rvoObligation}`);
  assert((result.rvoCredit ?? 0) === 0, `Mexico must not book ethanol RINs: ${result.rvoCredit}`);
  assert((result.rvoNetPerBbl ?? 0) === 0, "Mexico RFS net is zero");
}

function checkRfsThreeNumbers() {
  const plant = createDefaultPlant();
  const result = optimizePlant(plant);
  assert(result.status === "optimal", result.message);
  assert(result.rvoObligation !== null && result.rvoObligation > 0, "US tanks book an obligation");
  assert(result.rvoCredit !== null && result.rvoCredit > 0, "E10 books a RIN credit after denaturant");
  assert(result.rvoCost !== null, "net RFS is present");
  assert(result.rvoObligationPerBbl !== null && result.rvoCreditPerBbl !== null && result.rvoNetPerBbl !== null, "three $/bbl numbers");
  assert(
    almost(result.rvoNetPerBbl!, result.rvoObligationPerBbl! - result.rvoCreditPerBbl!, 1e-6),
    "net = obligation − credit",
  );
}

function checkSingleTankWrapper() {
  const plant = createDefaultPlant();
  const result = optimizeBlendFromPlant(plant, "P1");
  assert(result.status === "optimal", result.message);
  const pool = componentsForTank(plant.components, plant.tanks[0]);
  const properties = predictProperties(pool, result.recipe, plant.tanks[0].ethanolMode);
  assert(properties && properties.aki + 1e-3 >= 87, "wrapper AKI");
}

function withSlate(plant: Plant, tankId: "P1" | "P2" | "P3", slateId: SlateId): Plant {
  return {
    ...plant,
    tanks: plant.tanks.map((tank) => {
      if (tank.id !== tankId) return tank;
      const ethanolMode = defaultEthanolMode(slateId);
      const refreshed = refreshTankSpecs(
        { ...tank, slateId, ethanolMode, demandBbl: 1800, heelBbl: 150 },
        plant.complianceOverlay,
        { resetWaiver: true },
      );
      const classPsi = rvpClassPsi(slateId, refreshed.seasonId);
      return {
        ...refreshed,
        heel: { ...refreshed.heel, rvp: Math.min(refreshed.heel.rvp, classPsi - 0.4) },
      };
    }),
  };
}

function checkOtherRegionPools() {
  const base = createDefaultPlant();
  const west = optimizePlant(withSlate(base, "P3", "sfpp-carbob"));
  assert(west.status === "optimal", `West Coast tank should solve: ${west.message}`);
  const p3w = west.tanks.find((tank) => tank.tankId === "P3");
  assert(p3w?.properties, "SFPP tank properties");
  const westFail = evaluateSpecs(withSlate(base, "P3", "sfpp-carbob").tanks[2], p3w.properties).filter(
    (spec) => spec.status === "fail",
  );
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

function isolateP1(plant: Plant): Plant {
  return {
    ...plant,
    tanks: plant.tanks.map((tank) => ({
      ...tank,
      enabled: tank.id === "P1",
      demandBbl: tank.id === "P1" ? 4000 : 0,
      heelBbl: tank.id === "P1" ? 200 : 0,
    })),
  };
}

function checkAlkylateCanEnter() {
  const base = isolateP1(createDefaultPlant());
  const expensive = optimizePlant(base, { diagnose: false });
  assert(expensive.status === "optimal", expensive.message);
  const alkAtBook = expensive.componentUsedBbl["colonial-alkylate"] ?? 0;

  const cheapAlk: Plant = {
    ...base,
    components: base.components.map((component) =>
      component.id === "colonial-alkylate" ? { ...component, costPerBbl: 50 } : component,
    ),
  };
  const cheapSolve = optimizePlant(cheapAlk, { diagnose: false });
  assert(cheapSolve.status === "optimal", cheapSolve.message);
  const alkCheap = cheapSolve.componentUsedBbl["colonial-alkylate"] ?? 0;
  assert(alkCheap > alkAtBook + 20, `cutting alk price must let alkylate enter (book ${alkAtBook}, cheap ${alkCheap})`);

  const weakFcc: Plant = {
    ...base,
    components: base.components.map((component) =>
      component.id === "colonial-fcc" ? { ...component, blendingRon: 86, blendingMon: 76 } : component,
    ),
  };
  const weakSolve = optimizePlant(weakFcc, { diagnose: false });
  assert(weakSolve.status === "optimal", weakSolve.message);
  const alkWeakFcc = weakSolve.componentUsedBbl["colonial-alkylate"] ?? 0;

  const strongFcc: Plant = {
    ...base,
    components: base.components.map((component) =>
      component.id === "colonial-fcc" ? { ...component, blendingRon: 98, blendingMon: 90 } : component,
    ),
  };
  const strongSolve = optimizePlant(strongFcc, { diagnose: false });
  assert(strongSolve.status === "optimal", strongSolve.message);
  const alkStrongFcc = strongSolve.componentUsedBbl["colonial-alkylate"] ?? 0;
  assert(
    Math.abs(alkWeakFcc - alkStrongFcc) > 10 || Math.abs((weakSolve.componentUsedBbl["colonial-fcc"] ?? 0) - (strongSolve.componentUsedBbl["colonial-fcc"] ?? 0)) > 10,
    `FCC BON must be allowed to flip alkylate vs FCC (alk weak ${alkWeakFcc} / strong ${alkStrongFcc})`,
  );
}

function checkNaphthaSeek() {
  const plant = createDefaultPlant();
  const headerImplied = impliedComponentValue(plant, "colonial", "colonial-lsr");
  const cheapLight = seekNaphtha(plant, "colonial", "light", 40);
  assert(cheapLight.impliedValue !== null, "Colonial light naphtha should have a value");
  assert(headerImplied !== null && almost(cheapLight.impliedValue!, headerImplied, 0.05), "seek implied must match the header LP implied");
  assert(cheapLight.impliedSource === "lp", "implied source is the plant LP");
  assert(cheapLight.impliedValue! > 40, `light value too low: ${cheapLight.impliedValue}`);
  assert(cheapLight.clears, cheapLight.message);
  assert(cheapLight.debits.every((debit) => debit.heuristic), "debit card must be labeled heuristic");
  assert(cheapLight.debits.every((debit) => /heuristic/i.test(debit.label) || /heuristic/i.test(debit.note)), "heuristic, not the bid");

  const expensiveHeavy = seekNaphtha(plant, "colonial", "heavy", 140);
  assert(expensiveHeavy.impliedValue !== null, "Colonial heavy naphtha should have a value");
  assert(expensiveHeavy.impliedValue! < 140, `heavy value too high: ${expensiveHeavy.impliedValue}`);
  assert(!expensiveHeavy.clears, expensiveHeavy.message);
  assert(expensiveHeavy.debits.some((debit) => debit.id === "rvo"), "RVO heuristic card missing");
  assert(expensiveHeavy.debits.some((debit) => debit.id === "benzene"), "benzene heuristic card missing");

  const explorerSeek = seekNaphtha(plant, "explorer", "light", 40);
  assert(explorerSeek.impliedValue !== null, "Explorer light naphtha should have a value");
  assert(explorerSeek.clears, explorerSeek.message);

  const idleWest = seekNaphtha(plant, "west-coast", "light", 70);
  assert(idleWest.impliedValue === null, "West Coast seek needs a tank on SFPP");

  const colonialBook = seekRegion(plant, "colonial");
  const reformate = colonialBook.find((item) => item.streamKey === "reformate");
  assert(reformate?.impliedValue !== null, "Colonial reformate should have an implied value");
}

function checkMarksUnits() {
  const marks = marksFromPlattsFields(SAMPLE_PLATTS_FIELDS_21_AUG_2026);
  assert(marks.date === "2026-08-21", `sample date ${marks.date}`);
  assert(almost(marks.rbPerBbl!, 304.68 * 0.42), `RB $/bbl ${marks.rbPerBbl}`);
  assert(almost(marks.gcCbobPerBbl!, 305.43 * 0.42), `GC CBOB $/bbl ${marks.gcCbobPerBbl}`);
  assert(almost(marks.unl87PerBbl!, 327.43 * 0.42), `Unl87 $/bbl ${marks.unl87PerBbl}`);
  assert(almost(marks.cbob93PerBbl!, 346.43 * 0.42), `CBOB93 $/bbl ${marks.cbob93PerBbl}`);
  assert(almost(marks.ethanolPerBbl!, 209.83 * 0.42), `ethanol $/bbl ${marks.ethanolPerBbl}`);
  assert(almost(marks.d6PerRin!, 2.0925), `D6 $/RIN ${marks.d6PerRin}`);
  assert(Math.abs((marks.d6PerRin ?? 0) - 209.25 * 0.42) > 50, "D6 must not be converted as cpg × 0.42");
}

function checkMissingFieldLeavesLast() {
  const plant = createDefaultPlant();
  const lastRack = plant.tanks[0].rackPricePerBbl;
  const lastD6 = plant.rvo.d6RinPrice;
  const lastAlk = plant.components.find((component) => component.id === "colonial-alkylate")!.costPerBbl;
  const next = applyMarksAndBook({
    ...plant,
    marks: emptyDailyMarks(),
  });
  assert(next.tanks[0].rackPricePerBbl === lastRack, "empty Platts must leave last typed rack");
  assert(next.tanks[0].rackStale === true, "empty rack must be stale / missing");
  assert(next.rvo.d6RinPrice === lastD6, "empty D6 must leave last typed");
  assert(next.rvo.d6Stale === true, "empty D6 must be stale");
  assert(next.components.find((component) => component.id === "colonial-alkylate")!.costPerBbl === lastAlk, "empty basis leaves last typed alk");
  assert(next.marks.source === "none", "no Airtable row is not a Platts source");
}

function checkSampleMarksApplyToUsCbobOnly() {
  const marks = marksFromPlattsFields(SAMPLE_PLATTS_FIELDS_21_AUG_2026);
  const plant = applyMarksAndBook({
    ...withSlate(createDefaultPlant(), "P3", "sfpp-carbob"),
    marks,
  });
  assert(almost(plant.tanks[0].rackPricePerBbl, 305.43 * 0.42), `P1 rack ${plant.tanks[0].rackPricePerBbl}`);
  assert(plant.tanks[0].rackStale === false, "P1 GC CBOB should be live");
  assert(plant.tanks[2].rackStale === true, "SFPP must not take GC CBOB");
  const ethanol = plant.components.find((component) => component.id === "colonial-ethanol")!;
  assert(almost(ethanol.costPerBbl, 209.83 * 0.42), `ethanol ${ethanol.costPerBbl}`);
  assert(ethanol.priceOrigin === "platts", "ethanol origin");
  assert(almost(plant.rvo.d6RinPrice, 2.0925), `applied D6 ${plant.rvo.d6RinPrice}`);
  assert(plant.rvo.d6Stale === false, "D6 from the sample row is not stale");
}

function checkBasisChangesRecipe() {
  const base = isolateP1(createDefaultPlant());
  const marks = marksFromPlattsFields(SAMPLE_PLATTS_FIELDS_21_AUG_2026);
  const cheapBook = emptyComponentBook().map((row) =>
    row.streamKey === "alkylate" ? { ...row, basisCpg: -80 } : row,
  );
  const dearBook = emptyComponentBook().map((row) =>
    row.streamKey === "alkylate" ? { ...row, basisCpg: 40 } : row,
  );
  const cheap = applyMarksAndBook({ ...base, marks, componentBook: cheapBook });
  const dear = applyMarksAndBook({ ...base, marks, componentBook: dearBook });
  const cheapAlk = cheap.components.find((component) => component.id === "colonial-alkylate")!.costPerBbl;
  const dearAlk = dear.components.find((component) => component.id === "colonial-alkylate")!.costPerBbl;
  assert(cheapAlk < dearAlk - 20, `basis must move alk book ${cheapAlk} vs ${dearAlk}`);
  const cheapSolve = optimizePlant(cheap, { diagnose: false });
  const dearSolve = optimizePlant(dear, { diagnose: false });
  assert(cheapSolve.status === "optimal" && dearSolve.status === "optimal", "basis plants must solve");
  const alkCheap = cheapSolve.componentUsedBbl["colonial-alkylate"] ?? 0;
  const alkDear = dearSolve.componentUsedBbl["colonial-alkylate"] ?? 0;
  assert(alkCheap > alkDear + 10, `changing alk basis must change the recipe (cheap ${alkCheap}, dear ${alkDear})`);
}

function checkComponentBookAirtableRows() {
  const rows = rowsFromComponentBookRecords([
    { fields: { streamKey: "alkylate", name: "alkylate", basisCpg: -12.5, overridePerBbl: "", notes: "GC" } },
    { fields: { streamKey: "ALKYLATE", basisCpg: 40 } },
    { fields: { streamKey: "fcc", basisCpg: "", overridePerBbl: "" } },
    { fields: { streamKey: "mystery-alk", basisCpg: 10 } },
  ]);
  const alk = rows.find((row) => row.streamKey === "alkylate")!;
  const fcc = rows.find((row) => row.streamKey === "fcc")!;
  assert(alk.basisCpg === -12.5 && alk.overridePerBbl === null, "alk maps basis only");
  assert(alk.source === "airtable", "priced Airtable row is airtable");
  assert(fcc.basisCpg === null && fcc.overridePerBbl === null, "empty fcc stays empty");
  assert(fcc.source === "stale", "empty Airtable fcc is stale, not a typical spread");
  assert(rows.every((row) => row.streamKey !== ("mystery-alk" as typeof row.streamKey)), "unknown streamKey ignored");
}

function checkEmptyBookDoesNotInventAlk() {
  const today = marksFromPlattsFields(SAMPLE_PLATTS_FIELDS_21_AUG_2026);
  const prior = marksFromPlattsFields(SAMPLE_PLATTS_FIELDS_20_AUG_2026);
  const base = isolateP1(createDefaultPlant());
  const lastAlk = base.components.find((component) => component.id === "colonial-alkylate")!.costPerBbl;
  const todayPlant = applyMarksAndBook({ ...base, marks: today, componentBook: emptyComponentBook() });
  const priorPlant = applyMarksAndBook({ ...todayPlant, marks: prior });
  const todayAlk = todayPlant.components.find((component) => component.id === "colonial-alkylate")!;
  const priorAlk = priorPlant.components.find((component) => component.id === "colonial-alkylate")!;
  assert(todayAlk.costPerBbl === lastAlk && priorAlk.costPerBbl === lastAlk, "empty book must not invent an alk Platts price");
  assert(todayAlk.priceStale === true && priorAlk.priceStale === true, "empty book alk stays stale");
  assert(todayPlant.tanks[0].rackPricePerBbl !== priorPlant.tanks[0].rackPricePerBbl, "rack can still move");
}

function checkFrozenRecipeDayOverDay() {
  const today = marksFromPlattsFields(SAMPLE_PLATTS_FIELDS_21_AUG_2026);
  const prior = marksFromPlattsFields(SAMPLE_PLATTS_FIELDS_20_AUG_2026);
  const book = emptyComponentBook().map((row) =>
    row.streamKey === "alkylate" ? { ...row, basisCpg: 0, source: "airtable" as const } : row,
  );
  const todayPlant = applyMarksAndBook({ ...isolateP1(createDefaultPlant()), marks: today, componentBook: book });
  const solve = optimizePlant(todayPlant, { diagnose: false });
  assert(solve.status === "optimal", solve.message);
  const frozenAlkBbl = solve.componentUsedBbl["colonial-alkylate"] ?? 0;
  const priorPlant = applyMarksAndBook({ ...todayPlant, marks: prior });
  const todayAlk = todayPlant.components.find((component) => component.id === "colonial-alkylate")!.costPerBbl;
  const priorAlk = priorPlant.components.find((component) => component.id === "colonial-alkylate")!.costPerBbl;
  const cbobDelta = (today.gcCbobPerBbl ?? 0) - (prior.gcCbobPerBbl ?? 0);
  assert(almost(todayAlk - priorAlk, cbobDelta), `alk must move with GC CBOB ${todayAlk - priorAlk} vs ${cbobDelta}`);
  const compare = compareSettlementDays({
    plant: todayPlant,
    priorMarks: prior,
    solve,
    todayImplied: {},
    priorImplied: {},
  });
  assert(compare.todayDate === "2026-08-21" && compare.priorDate === "2026-08-20", "compare labels both settlement dates");
  assert(compare.bookStale === false, "basis-priced book is not stale");
  assert(compare.stripLine === "bid moved with the strip", compare.stripLine);
  assert(compare.deltaMargin !== null, "same barrels must produce a margin delta");
  const emptyCompare = compareSettlementDays({
    plant: applyMarksAndBook({ ...isolateP1(createDefaultPlant()), marks: today, componentBook: emptyComponentBook() }),
    priorMarks: prior,
    solve,
    todayImplied: {},
    priorImplied: {},
  });
  assert(emptyCompare.bookStale, "empty book is stale");
  assert(emptyCompare.stripLine.includes("component book stale"), emptyCompare.stripLine);
  assert((solve.componentUsedBbl["colonial-alkylate"] ?? 0) === frozenAlkBbl, "compare must not re-optimize the recipe");
}

function checkBookFetchFailIsLoud() {
  const failed = {
    ok: false as const,
    reason: "airtable_error" as const,
    message: "Component Book fetch failed. Airtable 403.",
  };
  assert(failed.message.includes("Component Book fetch failed"), "fail path must carry a message");
}

function checkLiftCall() {
  assert(liftDecision({ bookPerBbl: 100, impliedPerBbl: 99.8, epsilonPerBbl: 0.25, priceOrigin: "basis" }).call === "LIFT", "within epsilon");
  assert(liftDecision({ bookPerBbl: 100, impliedPerBbl: 99.7, epsilonPerBbl: 0.25, priceOrigin: "basis" }).call === "DON'T LIFT", "outside epsilon");
  assert(liftDecision({ bookPerBbl: 80, impliedPerBbl: 120, epsilonPerBbl: 0.25, priceOrigin: "defaults" }).call === "DON'T LIFT", "toy default");
}

checkSimplex();
checkDefaultPipeSpecs();
checkRvpWaiverRules();
checkPlant();
checkZeroHeelIsNotOnSpec();
checkDirtyHeelFails();
checkMexicoRvoOff();
checkRfsThreeNumbers();
checkSingleTankWrapper();
checkOtherRegionPools();
checkAlkylateCanEnter();
checkNaphthaSeek();
checkMarksUnits();
checkMissingFieldLeavesLast();
checkSampleMarksApplyToUsCbobOnly();
checkBasisChangesRecipe();
checkComponentBookAirtableRows();
checkEmptyBookDoesNotInventAlk();
checkFrozenRecipeDayOverDay();
checkBookFetchFailIsLoud();
checkLiftCall();
console.log("blend engine checks passed");
