export type BlendstockId = string;
export type StreamKey =
  | "nbutane"
  | "isomerate"
  | "lsr"
  | "heavy-naphtha"
  | "reformate"
  | "fcc"
  | "alkylate"
  | "lhc"
  | "ethanol"
  | "natural"
  | "raffinate";
export type TankId = "P1" | "P2" | "P3";
export type GradeId = "regular" | "midgrade" | "premium";
export type SeasonId = "summer78" | "summer90" | "summer115" | "winter135" | "winter150";
export type EthanolMode = "e0" | "e10" | "flex";
export type SlateId = "cpl-cbob" | "explorer-cbob" | "sfpp-carbob" | "mexico-zmvm" | "mexico-resto";
export type RegionId = "colonial" | "explorer" | "west-coast" | "mexico";
export type NaphthaKind = "light" | "heavy" | null;

export interface Blendstock {
  id: BlendstockId;
  streamKey: StreamKey;
  regionId: RegionId;
  name: string;
  shortName: string;
  family: string;
  color: string;
  ron: number;
  mon: number;
  rvp: number;
  specificGravity: number;
  sulfurPpm: number;
  benzeneVolPct: number;
  aromaticsVolPct: number;
  olefinsVolPct: number;
  oxygenWtPct: number;
  t10F: number;
  t50F: number;
  t90F: number;
  e200VolPct: number;
  e300VolPct: number;
  costPerBbl: number;
  inventoryBbl: number;
  minLiftBbl: number;
  maxLiftBbl: number;
  minVolPct: number;
  maxVolPct: number;
  enabled: boolean;
  naphtha: NaphthaKind;
}

export interface ProductSpecs {
  akiMin: number;
  ronMin: number | null;
  monMin: number | null;
  rvpMaxPsi: number;
  sulfurMaxPpm: number;
  benzeneMaxVolPct: number;
  aromaticsMaxVolPct: number;
  olefinsMaxVolPct: number;
  oxygenMinWtPct: number | null;
  oxygenMaxWtPct: number;
  t10MaxF: number | null;
  t50MinF: number | null;
  t50MaxF: number | null;
  t90MaxF: number | null;
  e200MinVolPct: number | null;
  e300MinVolPct: number | null;
  diMax: number | null;
}

export interface ProductTank {
  id: TankId;
  name: string;
  enabled: boolean;
  gradeId: GradeId;
  slateId: SlateId;
  seasonId: SeasonId;
  ethanolMode: EthanolMode;
  rvpWaiver: boolean;
  specs: ProductSpecs;
  inventoryBbl: number;
  capacityBbl: number;
  heelBbl: number;
  demandBbl: number;
  rackPricePerBbl: number;
}

export interface RvoSettings {
  enabled: boolean;
  /** Fraction of finished gasoline gallons that must be covered by RINs */
  obligationRate: number;
  /** D6 RIN price, $ per RIN */
  d6RinPrice: number;
  /** RINs generated per ethanol gallon */
  ethanolRinsPerGal: number;
}

export interface Plant {
  tanks: ProductTank[];
  components: Blendstock[];
  rvo: RvoSettings;
  /** Apply Tier 3 sulfur / MSAT2 benzene on top of pipeline receipt specs */
  complianceOverlay: boolean;
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
  t10F: number;
  t50F: number;
  t90F: number;
  e200VolPct: number;
  e300VolPct: number;
  di: number;
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
  volumes: Record<BlendstockId, number>;
}

export interface MultiRecipe {
  /** barrels[tankId][componentId] */
  barrels: Record<TankId, Record<BlendstockId, number>>;
}

export type SolverStatus = "optimal" | "infeasible" | "unbounded" | "idle";

export interface TankSolve {
  tankId: TankId;
  recipe: Recipe;
  barrels: Record<BlendstockId, number>;
  properties: BlendProperties | null;
}

export interface OptimizeResult {
  status: SolverStatus;
  recipe: Recipe;
  objective: number | null;
  message: string;
}

export interface PlantSolve {
  status: SolverStatus;
  message: string;
  recipe: MultiRecipe;
  tanks: TankSolve[];
  componentUsedBbl: Record<BlendstockId, number>;
  blendCost: number | null;
  revenue: number | null;
  rvoCost: number | null;
  margin: number | null;
}

export interface QualityDebit {
  id: string;
  label: string;
  amount: number;
  note: string;
}

export interface NaphthaSeekResult {
  regionId: RegionId;
  kind: Exclude<NaphthaKind, null>;
  offerPrice: number;
  impliedValue: number | null;
  clears: boolean;
  usedBbl: number;
  destination: Partial<Record<TankId, number>>;
  debits: QualityDebit[];
  message: string;
}
