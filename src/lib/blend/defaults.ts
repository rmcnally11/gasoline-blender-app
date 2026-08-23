import type {
  BlendCase,
  Blendstock,
  EthanolMode,
  GradeId,
  ProductSpecs,
  SeasonId,
} from "./types";

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

export function rackPricePerBbl(gradeId: GradeId): number {
  const grade = GRADE_OPTIONS.find((item) => item.id === gradeId) ?? GRADE_OPTIONS[0];
  return grade.rackPerGal * GALLONS_PER_BBL;
}

export function defaultComponents(): Blendstock[] {
  return [
    {
      id: "nbutane",
      name: "n-Butane",
      shortName: "nC4",
      family: "LPG",
      color: "#f59e0b",
      ron: 93,
      mon: 90,
      rvp: 52,
      specificGravity: 0.584,
      sulfurPpm: 4,
      benzeneVolPct: 0,
      aromaticsVolPct: 0,
      olefinsVolPct: 0,
      oxygenWtPct: 0,
      costPerBbl: 46,
      minVolPct: 0,
      maxVolPct: 8,
      enabled: true,
    },
    {
      id: "isomerate",
      name: "Isomerate",
      shortName: "ISO",
      family: "Light naphtha",
      color: "#38bdf8",
      ron: 87,
      mon: 84.5,
      rvp: 13.4,
      specificGravity: 0.655,
      sulfurPpm: 1,
      benzeneVolPct: 0.1,
      aromaticsVolPct: 0.6,
      olefinsVolPct: 0.4,
      oxygenWtPct: 0,
      costPerBbl: 88,
      minVolPct: 0,
      maxVolPct: 35,
      enabled: true,
    },
    {
      id: "lsr",
      name: "Light straight-run naphtha",
      shortName: "LSR",
      family: "Naphtha",
      color: "#94a3b8",
      ron: 70,
      mon: 68,
      rvp: 11.1,
      specificGravity: 0.682,
      sulfurPpm: 18,
      benzeneVolPct: 0.4,
      aromaticsVolPct: 4.5,
      olefinsVolPct: 0.8,
      oxygenWtPct: 0,
      costPerBbl: 76,
      minVolPct: 0,
      maxVolPct: 25,
      enabled: true,
    },
    {
      id: "reformate",
      name: "Reformate",
      shortName: "REF",
      family: "Aromatic",
      color: "#fb7185",
      ron: 98,
      mon: 88,
      rvp: 4.2,
      specificGravity: 0.812,
      sulfurPpm: 1,
      benzeneVolPct: 2.4,
      aromaticsVolPct: 66,
      olefinsVolPct: 0.8,
      oxygenWtPct: 0,
      costPerBbl: 104,
      minVolPct: 0,
      maxVolPct: 40,
      enabled: true,
    },
    {
      id: "fcc",
      name: "FCC gasoline",
      shortName: "FCC",
      family: "Cracked",
      color: "#a78bfa",
      ron: 91.5,
      mon: 81,
      rvp: 7.2,
      specificGravity: 0.746,
      sulfurPpm: 18,
      benzeneVolPct: 0.7,
      aromaticsVolPct: 27,
      olefinsVolPct: 21,
      oxygenWtPct: 0,
      costPerBbl: 91,
      minVolPct: 0,
      maxVolPct: 50,
      enabled: true,
    },
    {
      id: "alkylate",
      name: "Alkylate",
      shortName: "ALK",
      family: "Alkylate",
      color: "#34d399",
      ron: 96,
      mon: 94,
      rvp: 4.6,
      specificGravity: 0.698,
      sulfurPpm: 1,
      benzeneVolPct: 0,
      aromaticsVolPct: 0.2,
      olefinsVolPct: 0.4,
      oxygenWtPct: 0,
      costPerBbl: 118,
      minVolPct: 0,
      maxVolPct: 45,
      enabled: true,
    },
    {
      id: "lhc",
      name: "Light hydrocrackate",
      shortName: "LHC",
      family: "Hydrocrackate",
      color: "#2dd4bf",
      ron: 80,
      mon: 76,
      rvp: 8.1,
      specificGravity: 0.722,
      sulfurPpm: 2,
      benzeneVolPct: 0.2,
      aromaticsVolPct: 8,
      olefinsVolPct: 0.6,
      oxygenWtPct: 0,
      costPerBbl: 84,
      minVolPct: 0,
      maxVolPct: 30,
      enabled: true,
    },
    {
      id: "ethanol",
      name: "Ethanol",
      shortName: "EtOH",
      family: "Oxygenate",
      color: "#4ade80",
      ron: 109,
      mon: 90,
      rvp: 18,
      specificGravity: 0.789,
      sulfurPpm: 0,
      benzeneVolPct: 0,
      aromaticsVolPct: 0,
      olefinsVolPct: 0,
      oxygenWtPct: 34.73,
      costPerBbl: 71,
      minVolPct: 10,
      maxVolPct: 10,
      enabled: true,
    },
    {
      id: "natural",
      name: "Natural gasoline",
      shortName: "NG",
      family: "Condensate",
      color: "#fbbf24",
      ron: 73,
      mon: 71,
      rvp: 12.8,
      specificGravity: 0.668,
      sulfurPpm: 28,
      benzeneVolPct: 0.35,
      aromaticsVolPct: 5,
      olefinsVolPct: 1.5,
      oxygenWtPct: 0,
      costPerBbl: 74,
      minVolPct: 0,
      maxVolPct: 20,
      enabled: true,
    },
    {
      id: "raffinate",
      name: "Raffinate",
      shortName: "RAF",
      family: "Extract bottoms",
      color: "#818cf8",
      ron: 62,
      mon: 60,
      rvp: 6.4,
      specificGravity: 0.718,
      sulfurPpm: 2,
      benzeneVolPct: 0.15,
      aromaticsVolPct: 5.5,
      olefinsVolPct: 0.8,
      oxygenWtPct: 0,
      costPerBbl: 68,
      minVolPct: 0,
      maxVolPct: 15,
      enabled: true,
    },
  ];
}

export function buildSpecs(gradeId: GradeId, seasonId: SeasonId, ethanolMode: EthanolMode): ProductSpecs {
  const grade = GRADE_OPTIONS.find((item) => item.id === gradeId) ?? GRADE_OPTIONS[0];
  const season = SEASON_OPTIONS.find((item) => item.id === seasonId) ?? SEASON_OPTIONS[1];
  return {
    akiMin: grade.akiMin,
    ronMin: null,
    rvpMaxPsi: season.rvpMaxPsi,
    sulfurMaxPpm: 10,
    benzeneMaxVolPct: 0.62,
    aromaticsMaxVolPct: 35,
    olefinsMaxVolPct: 18,
    oxygenMinWtPct: ethanolMode === "e10" ? 3.5 : null,
    oxygenMaxWtPct: 3.9,
  };
}

export function applyEthanolMode(components: Blendstock[], mode: EthanolMode): Blendstock[] {
  return components.map((component) => {
    if (component.id !== "ethanol") return component;
    if (mode === "e0") {
      return { ...component, enabled: false, minVolPct: 0, maxVolPct: 0 };
    }
    if (mode === "e10") {
      return { ...component, enabled: true, minVolPct: 10, maxVolPct: 10 };
    }
    return { ...component, enabled: true, minVolPct: 0, maxVolPct: 10 };
  });
}

export function createDefaultCase(): BlendCase {
  const gradeId: GradeId = "regular";
  const seasonId: SeasonId = "summer90";
  const ethanolMode: EthanolMode = "e10";
  return {
    gradeId,
    seasonId,
    ethanolMode,
    rvpWaiver: true,
    rackPricePerBbl: rackPricePerBbl(gradeId),
    specs: buildSpecs(gradeId, seasonId, ethanolMode),
    components: applyEthanolMode(defaultComponents(), ethanolMode),
  };
}
