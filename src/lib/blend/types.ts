export type BlendstockId = string;

export interface Blendstock {
  id: BlendstockId;
  name: string;
  shortName: string;
  family: string;
  color: string;
  /** Blending research octane number */
  ron: number;
  /** Blending motor octane number */
  mon: number;
  /** Reid vapor pressure, psi */
  rvp: number;
  specificGravity: number;
  sulfurPpm: number;
  benzeneVolPct: number;
  aromaticsVolPct: number;
  olefinsVolPct: number;
  /** Oxygen, wt% on the neat stream (ethanol ~34.7) */
  oxygenWtPct: number;
  costPerBbl: number;
  minVolPct: number;
  maxVolPct: number;
  enabled: boolean;
}

export type GradeId = "regular" | "midgrade" | "premium";
export type SeasonId = "summer78" | "summer90" | "summer115" | "winter135" | "winter150";
export type EthanolMode = "e0" | "e10" | "flex";

export interface ProductSpecs {
  akiMin: number;
  ronMin: number | null;
  rvpMaxPsi: number;
  sulfurMaxPpm: number;
  benzeneMaxVolPct: number;
  aromaticsMaxVolPct: number;
  olefinsMaxVolPct: number;
  oxygenMinWtPct: number | null;
  oxygenMaxWtPct: number;
}

export interface BlendCase {
  gradeId: GradeId;
  seasonId: SeasonId;
  ethanolMode: EthanolMode;
  /** Federal 1-psi RVP waiver for 9–10 vol% ethanol conventional gasoline */
  rvpWaiver: boolean;
  rackPricePerBbl: number;
  specs: ProductSpecs;
  components: Blendstock[];
}

export interface BlendProperties {
  volume: number;
  ron: number;
  mon: number;
  aki: number;
  rvp: number;
  specificGravity: number;
  sulfurPpm: number;
  benzeneVolPct: number;
  aromaticsVolPct: number;
  olefinsVolPct: number;
  oxygenWtPct: number;
  costPerBbl: number;
}

export type SpecSense = "min" | "max";
export type SpecStatus = "pass" | "fail" | "idle";

export interface SpecCheck {
  id: string;
  label: string;
  unit: string;
  value: number;
  limit: number | null;
  sense: SpecSense;
  slack: number | null;
  status: SpecStatus;
  binding: boolean;
  blendRule: string;
}

export interface Recipe {
  /** Volume fractions, keys are blendstock ids. Need not sum to 1 until normalized. */
  volumes: Record<BlendstockId, number>;
}

export type SolverStatus = "optimal" | "infeasible" | "unbounded" | "idle";

export interface OptimizeResult {
  status: SolverStatus;
  recipe: Recipe;
  objective: number | null;
  message: string;
}
