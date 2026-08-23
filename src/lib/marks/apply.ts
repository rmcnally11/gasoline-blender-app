import { isUsCbob } from "@/lib/blend/specs";
import type { Blendstock, GradeId, Plant, PriceOrigin, ProductTank, RackProduct, SlateId } from "@/lib/blend/types";
import { bookPricePerBbl, emptyComponentBook, mergeComponentBook } from "./component-book";
import { emptyDailyMarks } from "./convert";
import type { BookStreamKey, ComponentBookRow, DailyMarks } from "./types";

const BOOK_KEYS = new Set<string>([
  "nbutane",
  "fcc",
  "reformate",
  "alkylate",
  "isomerate",
  "lsr",
  "heavy-naphtha",
]);

export function defaultRackProduct(gradeId: GradeId, slateId: SlateId): RackProduct {
  if (!isUsCbob(slateId)) return "manual";
  if (gradeId === "premium") return "cbob93";
  if (gradeId === "regular") return "cbob";
  return "manual";
}

export function rackProductOf(tank: ProductTank): RackProduct {
  return tank.rackProduct ?? defaultRackProduct(tank.gradeId, tank.slateId);
}

function rackFromMarks(
  tank: ProductTank,
  marks: DailyMarks,
): { price: number | null; stale: boolean; label: string } {
  if (!isUsCbob(tank.slateId)) {
    return { price: null, stale: true, label: "no GC rack for this region" };
  }
  const product = rackProductOf(tank);
  if (product === "manual") {
    return { price: null, stale: true, label: "manual rack" };
  }
  if (product === "cbob") {
    return { price: marks.gcCbobPerBbl, stale: marks.gcCbobStale, label: "GC CBOB" };
  }
  if (product === "unl87") {
    return { price: marks.unl87PerBbl, stale: marks.unl87Stale, label: "GC Unl87" };
  }
  return { price: marks.cbob93PerBbl, stale: marks.cbob93Stale, label: "GC CBOB93" };
}

function applyTankRack(tank: ProductTank, marks: DailyMarks): ProductTank {
  const product = rackProductOf(tank);
  if (product === "manual") {
    return {
      ...tank,
      rackProduct: "manual",
      rackStale: true,
      rackMarksLabel: "manual / last typed",
    };
  }
  const rack = rackFromMarks(tank, marks);
  if (rack.price === null) {
    return {
      ...tank,
      rackProduct: product,
      rackStale: true,
      rackMarksLabel: `${rack.label} stale / missing`,
    };
  }
  return {
    ...tank,
    rackProduct: product,
    rackPricePerBbl: rack.price,
    rackStale: false,
    rackMarksLabel: rack.label,
  };
}

function applyEthanol(component: Blendstock, marks: DailyMarks): Blendstock {
  if (component.streamKey !== "ethanol") return component;
  if (marks.ethanolPerBbl === null || marks.ethanolStale) {
    return { ...component, priceStale: true };
  }
  return {
    ...component,
    costPerBbl: marks.ethanolPerBbl,
    priceOrigin: "platts",
    priceStale: false,
  };
}

function applyBookRow(component: Blendstock, row: ComponentBookRow | undefined, gcCbobPerBbl: number | null): Blendstock {
  if (!BOOK_KEYS.has(component.streamKey)) return component;
  if (component.priceOrigin === "typed") {
    return { ...component, priceStale: false };
  }
  if (!row) {
    return { ...component, priceStale: true };
  }
  const priced = bookPricePerBbl(row, gcCbobPerBbl);
  if (priced.price === null || priced.origin === null) {
    return { ...component, priceStale: true };
  }
  return {
    ...component,
    costPerBbl: priced.price,
    priceOrigin: priced.origin,
    priceStale: false,
  };
}

/**
 * Apply Platts Daily + the trader's component book.
 * Empty Platts fields leave the last typed value and flag stale / missing.
 * Never labels the dummy $104.16 rack or $0.85 RIN as Platts.
 */
export function applyMarksAndBook(plant: Plant): Plant {
  const marks = plant.marks ?? emptyDailyMarks();
  const componentBook = mergeComponentBook(plant.componentBook ?? emptyComponentBook());
  const byKey = new Map(componentBook.map((row) => [row.streamKey, row]));

  const tanks = plant.tanks.map((tank) => applyTankRack(tank, marks));

  const components = plant.components.map((component) => {
    const afterEthanol = applyEthanol(component, marks);
    const row = BOOK_KEYS.has(afterEthanol.streamKey)
      ? byKey.get(afterEthanol.streamKey as BookStreamKey)
      : undefined;
    return applyBookRow(afterEthanol, row, marks.gcCbobPerBbl);
  });

  const rvo =
    marks.d6PerRin === null || marks.d6Stale
      ? { ...plant.rvo, d6Stale: true, d6Cts: marks.d6Cts }
      : { ...plant.rvo, d6RinPrice: marks.d6PerRin, d6Stale: false, d6Cts: marks.d6Cts };

  return {
    ...plant,
    marks,
    componentBook,
    tanks,
    components,
    rvo,
    liftEpsilonPerBbl: Number.isFinite(plant.liftEpsilonPerBbl) ? plant.liftEpsilonPerBbl : 0.25,
  };
}

export function withTypedPrice(component: Blendstock, costPerBbl: number): Blendstock {
  return {
    ...component,
    costPerBbl,
    priceOrigin: "typed" as PriceOrigin,
    priceStale: false,
  };
}

export function clearTypedForStream(components: Blendstock[], streamKey: string): Blendstock[] {
  return components.map((component) =>
    component.streamKey === streamKey && component.priceOrigin === "typed"
      ? { ...component, priceOrigin: undefined }
      : component,
  );
}
