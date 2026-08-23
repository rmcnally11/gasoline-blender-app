import type { EthanolMode, GradeId, ProductSpecs, ProductTank, SeasonId, SlateId } from "./types";

export const SLATE_OPTIONS: { id: SlateId; label: string; region: string }[] = [
  { id: "cpl-cbob", label: "CPL CBOB", region: "Colonial" },
  { id: "explorer-cbob", label: "Explorer CBOB", region: "Explorer" },
  { id: "sfpp-carbob", label: "SFPP West Coast BOB", region: "West Coast" },
  { id: "mexico-zmvm", label: "Mexico ZMVM", region: "Mexico" },
  { id: "mexico-resto", label: "Mexico resto", region: "Mexico" },
];

export const GRADE_OPTIONS: { id: GradeId; label: string; akiMin: number; rackPerGal: number }[] = [
  { id: "regular", label: "Regular 87", akiMin: 87, rackPerGal: 2.48 },
  { id: "midgrade", label: "Midgrade 89", akiMin: 89, rackPerGal: 2.68 },
  { id: "premium", label: "Premium 93", akiMin: 93, rackPerGal: 2.92 },
];

export const SEASON_OPTIONS: { id: SeasonId; label: string; rvpMaxPsi: number }[] = [
  { id: "summer78", label: "Summer 7.8 psi", rvpMaxPsi: 7.8 },
  { id: "summer90", label: "Summer 9.0 psi", rvpMaxPsi: 9.0 },
  { id: "summer115", label: "Summer 11.5 psi", rvpMaxPsi: 11.5 },
  { id: "winter135", label: "Winter 13.5 psi", rvpMaxPsi: 13.5 },
  { id: "winter150", label: "Winter 15.0 psi", rvpMaxPsi: 15.0 },
];

export const ETHANOL_OPTIONS: { id: EthanolMode; label: string }[] = [
  { id: "e10", label: "E10 splash" },
  { id: "e0", label: "E0 / no ethanol" },
  { id: "flex", label: "Flex 0–10%" },
];

const GALLONS_PER_BBL = 42;

export function isUsCbob(slateId: SlateId): boolean {
  return slateId === "cpl-cbob" || slateId === "explorer-cbob";
}

export function isExportSlate(slateId: SlateId): boolean {
  return slateId === "mexico-zmvm" || slateId === "mexico-resto";
}

export function rackPricePerBbl(gradeId: GradeId, slateId: SlateId): number {
  const grade = GRADE_OPTIONS.find((item) => item.id === gradeId) ?? GRADE_OPTIONS[0];
  let perGal = grade.rackPerGal;
  if (slateId === "sfpp-carbob") perGal += 0.28;
  if (slateId === "mexico-zmvm" || slateId === "mexico-resto") {
    perGal = gradeId === "premium" ? 2.85 : 2.42;
  }
  if (slateId !== "sfpp-carbob" && slateId !== "mexico-zmvm" && slateId !== "mexico-resto" && gradeId === "premium") {
    perGal = 2.92;
  }
  return perGal * GALLONS_PER_BBL;
}

export function freightPerGalFor(slateId: SlateId): number {
  switch (slateId) {
    case "cpl-cbob":
      return 0.04;
    case "explorer-cbob":
      return 0.045;
    case "sfpp-carbob":
      return 0.06;
    case "mexico-zmvm":
    case "mexico-resto":
      return 0.1;
  }
}

function distillationForSeason(seasonId: SeasonId): Pick<
  ProductSpecs,
  "t10MaxF" | "t50MinF" | "t50MaxF" | "t90MaxF" | "e200MinVolPct" | "e300MinVolPct" | "diMax"
> {
  switch (seasonId) {
    case "winter150":
      return { t10MaxF: 122, t50MinF: 150, t50MaxF: 230, t90MaxF: 365, e200MinVolPct: null, e300MinVolPct: null, diMax: 1200 };
    case "winter135":
      return { t10MaxF: 131, t50MinF: 150, t50MaxF: 235, t90MaxF: 365, e200MinVolPct: null, e300MinVolPct: null, diMax: 1220 };
    case "summer115":
      return { t10MaxF: 140, t50MinF: 150, t50MaxF: 240, t90MaxF: 365, e200MinVolPct: null, e300MinVolPct: null, diMax: 1230 };
    default:
      return { t10MaxF: 158, t50MinF: 150, t50MaxF: 250, t90MaxF: 374, e200MinVolPct: null, e300MinVolPct: null, diMax: 1250 };
  }
}

/** Published RVP class. No 8.8 hack on Colonial 7.8. */
export function rvpClassPsi(slateId: SlateId, seasonId: SeasonId): number {
  if (slateId === "sfpp-carbob") {
    if (seasonId.startsWith("winter")) return 11.5;
    if (seasonId === "summer78") return 6.4;
    return 7.0;
  }
  if (slateId === "mexico-zmvm") {
    return seasonId.startsWith("winter") ? 11.5 : 7.8;
  }
  if (slateId === "mexico-resto") {
    return seasonId.startsWith("winter") ? 13.5 : 9.0;
  }
  return (SEASON_OPTIONS.find((item) => item.id === seasonId) ?? SEASON_OPTIONS[1]).rvpMaxPsi;
}

export function rvpClassLabel(slateId: SlateId, seasonId: SeasonId): string {
  const psi = rvpClassPsi(slateId, seasonId);
  const season = SEASON_OPTIONS.find((item) => item.id === seasonId);
  return `${season?.label ?? seasonId} · class ${psi.toFixed(1)} psi`;
}

/** 1-psi waiver is legal only for E10 in a true 9.0 class. */
export function waiverEligible(slateId: SlateId, seasonId: SeasonId, ethanolMode: EthanolMode): boolean {
  return ethanolMode === "e10" && rvpClassPsi(slateId, seasonId) === 9.0;
}

export function defaultRvpWaiver(slateId: SlateId, seasonId: SeasonId, ethanolMode: EthanolMode): boolean {
  return waiverEligible(slateId, seasonId, ethanolMode);
}

export function waiverApplies(slateId: SlateId, seasonId: SeasonId, ethanolMode: EthanolMode, requested: boolean): boolean {
  return requested && waiverEligible(slateId, seasonId, ethanolMode);
}

export function pipeRvpLimit(slateId: SlateId, seasonId: SeasonId): number {
  return rvpClassPsi(slateId, seasonId);
}

export function finishedRvpLimit(
  slateId: SlateId,
  seasonId: SeasonId,
  ethanolMode: EthanolMode,
  waiverRequested: boolean,
): number {
  const klass = rvpClassPsi(slateId, seasonId);
  return klass + (waiverApplies(slateId, seasonId, ethanolMode, waiverRequested) ? 1 : 0);
}

function octaneFor(slateId: SlateId, gradeId: GradeId): { akiMin: number; ronMin: number | null; monMin: number | null } {
  if (slateId === "mexico-zmvm" || slateId === "mexico-resto") {
    if (gradeId === "premium") return { akiMin: 91, ronMin: 94, monMin: null };
    if (gradeId === "midgrade") return { akiMin: 89, ronMin: null, monMin: 82 };
    return { akiMin: 87, ronMin: null, monMin: 82 };
  }
  if (slateId === "sfpp-carbob" && gradeId === "premium") {
    return { akiMin: 91, ronMin: null, monMin: null };
  }
  const grade = GRADE_OPTIONS.find((item) => item.id === gradeId) ?? GRADE_OPTIONS[0];
  return { akiMin: grade.akiMin, ronMin: null, monMin: null };
}

export function defaultEthanolMode(slateId: SlateId): EthanolMode {
  if (slateId === "mexico-zmvm" || slateId === "mexico-resto") return "e0";
  return "e10";
}

function baseQuality(
  slateId: SlateId,
  gradeId: GradeId,
  seasonId: SeasonId,
): Omit<ProductSpecs, "rvpMaxPsi" | "sulfurMaxPpm" | "benzeneMaxVolPct" | "oxygenMinWtPct" | "oxygenMaxWtPct"> & {
  sulfurMaxPpm: number;
  benzeneMaxVolPct: number;
  oxygenMinWtPct: number | null;
  oxygenMaxWtPct: number;
} {
  const octane = octaneFor(slateId, gradeId);
  const dist = distillationForSeason(seasonId);

  if (slateId === "sfpp-carbob") {
    return {
      ...octane,
      sulfurMaxPpm: 20,
      benzeneMaxVolPct: 0.8,
      aromaticsMaxVolPct: 35,
      olefinsMaxVolPct: 10,
      oxygenMinWtPct: 1.86,
      oxygenMaxWtPct: 3.7,
      t10MaxF: dist.t10MaxF,
      t50MinF: 150,
      t50MaxF: 220,
      t90MaxF: 330,
      e200MinVolPct: 50,
      e300MinVolPct: 75,
      diMax: 1250,
    };
  }

  if (slateId === "mexico-zmvm") {
    return {
      ...octane,
      sulfurMaxPpm: 30,
      benzeneMaxVolPct: 1.0,
      aromaticsMaxVolPct: 25,
      olefinsMaxVolPct: 10,
      oxygenMinWtPct: null,
      oxygenMaxWtPct: 2.7,
      ...dist,
    };
  }

  if (slateId === "mexico-resto") {
    return {
      ...octane,
      sulfurMaxPpm: 30,
      benzeneMaxVolPct: 2.0,
      aromaticsMaxVolPct: 32,
      olefinsMaxVolPct: 12.5,
      oxygenMinWtPct: null,
      oxygenMaxWtPct: 2.7,
      ...dist,
    };
  }

  return {
    ...octane,
    sulfurMaxPpm: 80,
    benzeneMaxVolPct: 3.8,
    aromaticsMaxVolPct: 35,
    olefinsMaxVolPct: 18,
    oxygenMinWtPct: null,
    oxygenMaxWtPct: 3.9,
    ...dist,
  };
}

/** What Colonial / Explorer / SFPP / Mexico will take. Overlay never touches this. */
export function buildPipeSpecs(slateId: SlateId, gradeId: GradeId, seasonId: SeasonId): ProductSpecs {
  const base = baseQuality(slateId, gradeId, seasonId);
  return {
    ...base,
    rvpMaxPsi: pipeRvpLimit(slateId, seasonId),
  };
}

/** What you must hit at the rack. Overlay 10 ppm / 0.62% benzene is here only, US CBOB only. */
export function buildFinishedSpecs(
  slateId: SlateId,
  gradeId: GradeId,
  seasonId: SeasonId,
  ethanolMode: EthanolMode,
  complianceOverlay: boolean,
  waiverRequested: boolean,
): ProductSpecs {
  const base = baseQuality(slateId, gradeId, seasonId);
  const overlay = complianceOverlay && isUsCbob(slateId);
  return {
    ...base,
    rvpMaxPsi: finishedRvpLimit(slateId, seasonId, ethanolMode, waiverRequested),
    sulfurMaxPpm: overlay ? 10 : base.sulfurMaxPpm,
    benzeneMaxVolPct: overlay ? 0.62 : base.benzeneMaxVolPct,
    oxygenMinWtPct: ethanolMode === "e10" && isUsCbob(slateId) ? 3.5 : base.oxygenMinWtPct,
    oxygenMaxWtPct: base.oxygenMaxWtPct,
  };
}

/** LP target: pipe CBOB unless the finished overlay is on for a US tank. */
export function buildLpSpecs(
  slateId: SlateId,
  pipeSpecs: ProductSpecs,
  finishedSpecs: ProductSpecs,
  complianceOverlay: boolean,
): ProductSpecs {
  if (complianceOverlay && isUsCbob(slateId)) return { ...finishedSpecs };
  return { ...pipeSpecs };
}

export function buildSpecLayers(
  slateId: SlateId,
  gradeId: GradeId,
  seasonId: SeasonId,
  ethanolMode: EthanolMode,
  complianceOverlay: boolean,
  waiverRequested: boolean,
): { pipeSpecs: ProductSpecs; finishedSpecs: ProductSpecs; specs: ProductSpecs } {
  const pipeSpecs = buildPipeSpecs(slateId, gradeId, seasonId);
  const finishedSpecs = buildFinishedSpecs(
    slateId,
    gradeId,
    seasonId,
    ethanolMode,
    complianceOverlay,
    waiverRequested,
  );
  return {
    pipeSpecs,
    finishedSpecs,
    specs: buildLpSpecs(slateId, pipeSpecs, finishedSpecs, complianceOverlay),
  };
}

/** @deprecated Use buildSpecLayers. Kept so older call sites still compile during the cutover. */
export function buildSpecs(
  slateId: SlateId,
  gradeId: GradeId,
  seasonId: SeasonId,
  ethanolMode: EthanolMode,
  complianceOverlay: boolean,
): ProductSpecs {
  return buildSpecLayers(slateId, gradeId, seasonId, ethanolMode, complianceOverlay, false).specs;
}

export function lpRvpLimitFor(tank: Pick<ProductTank, "slateId" | "seasonId" | "ethanolMode" | "rvpWaiver" | "specs">): number {
  return tank.specs.rvpMaxPsi;
}

export function slateNote(slateId: SlateId, complianceOverlay: boolean): string {
  if (slateId === "cpl-cbob") {
    return complianceOverlay
      ? "Colonial CBOB pipe receipt is unchanged. Overlay is FINISHED only: 10 ppm S / 0.62 vol% benzene."
      : "Colonial CBOB pipe receipt: 80 ppm sulfur, 3.8 vol% benzene. Overlay is off — LP uses the pipe tariff.";
  }
  if (slateId === "explorer-cbob") {
    return complianceOverlay
      ? "Explorer CBOB pipe receipt is unchanged. Overlay is FINISHED only: 10 ppm S / 0.62 vol% benzene."
      : "Explorer CBOB pipe receipt: 80 ppm sulfur, 3.8 vol% benzene. Overlay is off — LP uses the pipe tariff.";
  }
  if (slateId === "sfpp-carbob") {
    return "SFPP West Coast BOB published caps (20 ppm S, 0.80 vol% benzene, T50 220 / T90 330). D86 T50/T90/DI are volume-linear approximations — not a CaRFG3 V/L or certified CARBOB check.";
  }
  if (slateId === "mexico-zmvm") {
    return "NOM-016 ZMVM: 30 ppm S, 1.0% benzene, 25% aromatics, 10% olefins, Premium RON 94 / AKI 91. Export — no RFS.";
  }
  return "NOM-016 resto del país: 30 ppm S, 2.0% benzene, 32% aromatics. Export — no RFS.";
}
