import type { EthanolMode, GradeId, ProductSpecs, SeasonId, SlateId } from "./types";

export const SLATE_OPTIONS: { id: SlateId; label: string; region: string }[] = [
  { id: "cpl-cbob", label: "CPL CBOB", region: "Colonial" },
  { id: "explorer-cbob", label: "Explorer CBOB", region: "Explorer" },
  { id: "sfpp-carbob", label: "SFPP CARBOB", region: "West Coast" },
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

function seasonalRvp(slateId: SlateId, seasonId: SeasonId): number {
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
  if (slateId === "cpl-cbob" && seasonId === "summer90") return 9.0;
  if (slateId === "cpl-cbob" && seasonId === "summer78") return 8.8;
  return (SEASON_OPTIONS.find((item) => item.id === seasonId) ?? SEASON_OPTIONS[1]).rvpMaxPsi;
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

export function buildSpecs(
  slateId: SlateId,
  gradeId: GradeId,
  seasonId: SeasonId,
  ethanolMode: EthanolMode,
  complianceOverlay: boolean,
): ProductSpecs {
  const octane = octaneFor(slateId, gradeId);
  const dist = distillationForSeason(seasonId);
  const rvpMaxPsi = seasonalRvp(slateId, seasonId);

  if (slateId === "sfpp-carbob") {
    return {
      ...octane,
      rvpMaxPsi,
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
      rvpMaxPsi,
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
      rvpMaxPsi,
      sulfurMaxPpm: 30,
      benzeneMaxVolPct: 2.0,
      aromaticsMaxVolPct: 32,
      olefinsMaxVolPct: 12.5,
      oxygenMinWtPct: null,
      oxygenMaxWtPct: 2.7,
      ...dist,
    };
  }

  const pipelineSulfur = 80;
  const pipelineBenzene = 3.8;
  return {
    ...octane,
    rvpMaxPsi,
    sulfurMaxPpm: complianceOverlay ? 10 : pipelineSulfur,
    benzeneMaxVolPct: complianceOverlay ? 0.62 : pipelineBenzene,
    aromaticsMaxVolPct: 35,
    olefinsMaxVolPct: 18,
    oxygenMinWtPct: ethanolMode === "e10" ? 3.5 : null,
    oxygenMaxWtPct: 3.9,
    ...dist,
  };
}

export function slateNote(slateId: SlateId, complianceOverlay: boolean): string {
  if (slateId === "cpl-cbob") {
    return complianceOverlay
      ? "Colonial CBOB receipt plus Tier 3 10 ppm sulfur and MSAT2 0.62 vol% benzene."
      : "Colonial CBOB receipt: 80 ppm sulfur, 3.8 vol% benzene, D4814 distillation / DI.";
  }
  if (slateId === "explorer-cbob") {
    return complianceOverlay
      ? "Explorer CBOB receipt plus Tier 3 / MSAT2 overlay."
      : "Explorer CBOB receipt: 80 ppm sulfur, 3.8 vol% benzene, D4814 DI.";
  }
  if (slateId === "sfpp-carbob") {
    return "SFPP / CaRFG3 cap-style CARBOB: 20 ppm S, 0.80 vol% benzene, T50 220 / T90 330, olefins 10%.";
  }
  if (slateId === "mexico-zmvm") {
    return "NOM-016 ZMVM: 30 ppm S, 1.0% benzene, 25% aromatics, 10% olefins, Premium RON 94 / AKI 91.";
  }
  return "NOM-016 resto del país: 30 ppm S, 2.0% benzene, 32% aromatics.";
}
