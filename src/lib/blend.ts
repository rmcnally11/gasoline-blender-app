/**
 * Gasoline blending engine.
 *
 * Volumetric linear blending is used for octane and density, which is the
 * common shop-floor approximation. Reid Vapor Pressure (RVP) is blended with
 * the Chevron blending-index correlation (BI = RVP^1.25), since RVP does not
 * blend linearly by volume.
 */

export interface Component {
  id: string;
  name: string;
  /** Research Octane Number */
  ron: number;
  /** Motor Octane Number */
  mon: number;
  /** Reid Vapor Pressure, psi */
  rvp: number;
  /** Density at 15 degrees C, kg/L */
  density: number;
  /** Ethanol content, volume percent */
  ethanolPct: number;
  /** Cost, USD per liter */
  costPerL: number;
}

export interface BlendComponentResult {
  id: string;
  name: string;
  volume: number;
  fraction: number;
}

export interface BlendResult {
  totalVolume: number;
  ron: number;
  mon: number;
  /** Anti-Knock Index, (RON + MON) / 2 */
  aki: number;
  rvp: number;
  density: number;
  ethanolPct: number;
  costPerL: number;
  totalCost: number;
  components: BlendComponentResult[];
}

export interface GradeSpec {
  id: string;
  name: string;
  minAki: number;
  maxEthanolPct: number;
}

export type Season = "summer" | "winter";

export interface SpecCheck {
  label: string;
  value: number;
  limit: number;
  unit: string;
  /** "min" means value must be >= limit, "max" means value must be <= limit. */
  direction: "min" | "max";
  pass: boolean;
}

export interface SpecEvaluation {
  onSpec: boolean;
  checks: SpecCheck[];
}

const RVP_BLEND_EXPONENT = 1.25;

/** Maximum RVP allowed by season, psi (representative US summer/winter limits). */
export const SEASON_MAX_RVP: Record<Season, number> = {
  summer: 9.0,
  winter: 13.5,
};

export const GRADE_SPECS: GradeSpec[] = [
  { id: "regular", name: "Regular (87)", minAki: 87, maxEthanolPct: 10 },
  { id: "midgrade", name: "Midgrade (89)", minAki: 89, maxEthanolPct: 10 },
  { id: "premium", name: "Premium (91)", minAki: 91, maxEthanolPct: 10 },
];

export const DEFAULT_COMPONENTS: Component[] = [
  { id: "reformate", name: "Reformate", ron: 98, mon: 88, rvp: 3.0, density: 0.8, ethanolPct: 0, costPerL: 0.85 },
  { id: "alkylate", name: "Alkylate", ron: 95, mon: 92, rvp: 5.0, density: 0.7, ethanolPct: 0, costPerL: 0.95 },
  { id: "fcc", name: "FCC Naphtha", ron: 92, mon: 80, rvp: 6.0, density: 0.75, ethanolPct: 0, costPerL: 0.75 },
  { id: "lsr", name: "Light Straight Run", ron: 70, mon: 68, rvp: 11.0, density: 0.67, ethanolPct: 0, costPerL: 0.6 },
  { id: "butane", name: "n-Butane", ron: 94, mon: 90, rvp: 52.0, density: 0.58, ethanolPct: 0, costPerL: 0.45 },
  { id: "ethanol", name: "Ethanol", ron: 108, mon: 92, rvp: 18.0, density: 0.79, ethanolPct: 100, costPerL: 0.7 },
];

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Blend the supplied components at the given volumes (arbitrary but consistent
 * volume unit, e.g. barrels or liters). Components with zero or negative volume
 * are ignored.
 */
export function blendComponents(
  components: Component[],
  volumes: Record<string, number>
): BlendResult {
  const active = components
    .map((component) => ({ component, volume: Number(volumes[component.id]) || 0 }))
    .filter((entry) => entry.volume > 0);

  const totalVolume = active.reduce((sum, entry) => sum + entry.volume, 0);

  if (totalVolume <= 0) {
    return {
      totalVolume: 0,
      ron: 0,
      mon: 0,
      aki: 0,
      rvp: 0,
      density: 0,
      ethanolPct: 0,
      costPerL: 0,
      totalCost: 0,
      components: [],
    };
  }

  let ron = 0;
  let mon = 0;
  let density = 0;
  let ethanolPct = 0;
  let totalCost = 0;
  let rvpBlendIndex = 0;

  const componentResults: BlendComponentResult[] = active.map(({ component, volume }) => {
    const fraction = volume / totalVolume;
    ron += fraction * component.ron;
    mon += fraction * component.mon;
    density += fraction * component.density;
    ethanolPct += fraction * component.ethanolPct;
    rvpBlendIndex += fraction * component.rvp ** RVP_BLEND_EXPONENT;
    totalCost += volume * component.costPerL;
    return {
      id: component.id,
      name: component.name,
      volume: round(volume, 3),
      fraction: round(fraction * 100, 2),
    };
  });

  const rvp = rvpBlendIndex ** (1 / RVP_BLEND_EXPONENT);
  const aki = (ron + mon) / 2;

  return {
    totalVolume: round(totalVolume, 3),
    ron: round(ron),
    mon: round(mon),
    aki: round(aki),
    rvp: round(rvp),
    density: round(density, 3),
    ethanolPct: round(ethanolPct),
    costPerL: round(totalCost / totalVolume, 3),
    totalCost: round(totalCost),
    components: componentResults,
  };
}

/** Evaluate a blend result against a grade specification and seasonal RVP limit. */
export function evaluateBlend(
  result: BlendResult,
  spec: GradeSpec,
  season: Season
): SpecEvaluation {
  const maxRvp = SEASON_MAX_RVP[season];
  const checks: SpecCheck[] = [
    {
      label: "Anti-Knock Index",
      value: result.aki,
      limit: spec.minAki,
      unit: "AKI",
      direction: "min",
      pass: result.aki >= spec.minAki,
    },
    {
      label: `RVP (${season})`,
      value: result.rvp,
      limit: maxRvp,
      unit: "psi",
      direction: "max",
      pass: result.rvp <= maxRvp,
    },
    {
      label: "Ethanol content",
      value: result.ethanolPct,
      limit: spec.maxEthanolPct,
      unit: "vol%",
      direction: "max",
      pass: result.ethanolPct <= spec.maxEthanolPct,
    },
  ];

  return {
    onSpec: result.totalVolume > 0 && checks.every((check) => check.pass),
    checks,
  };
}

export function findGrade(id: string): GradeSpec | undefined {
  return GRADE_SPECS.find((grade) => grade.id === id);
}
