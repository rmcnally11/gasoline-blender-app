import type { ComponentBookRow, DailyMarks } from "../marks/types";

export type BlendstockId = string;
export type StreamKey =
  | "nbutane"
  | "isomerate"
  | "lsr"
  | "heavy-naphtha"
  | "reformate"
  | "fcc"
  | "alkylate"
  | "isooctane"
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
export type SpecLayer = "pipe" | "finished";
export type PriceOrigin = "defaults" | "platts" | "basis" | "override" | "typed";
export type RackProduct = "cbob" | "unl87" | "cbob93" | "manual";
export type MarksLoadState = "idle" | "loading" | "ok" | "missing_token" | "error";

export interface Blendstock {
  id: BlendstockId;
  streamKey: StreamKey;
  regionId: RegionId;
  name: string;
  shortName: string;
  family: string;
  color: string;
  /** Neat / reported RON. The LP uses blendingRon. */
  ron: number;
  /** Neat / reported MON. The LP uses blendingMon. */
  mon: number;
  /** Blending octane number (RON) used by the LP and the mix. */
  blendingRon: number;
  /** Blending octane number (MON) used by the LP and the mix. */
  blendingMon: number;
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
  /** How the book price was set. `defaults` is a toy placeholder — not a lift. */
  priceOrigin?: PriceOrigin;
  priceStale?: boolean;
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

/** Leftover barrels already in the tank. Quality is fixed; the LP blends heel + new components. */
export interface HeelQuality {
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
}

export interface ProductTank {
  id: TankId;
  name: string;
  enabled: boolean;
  gradeId: GradeId;
  slateId: SlateId;
  seasonId: SeasonId;
  ethanolMode: EthanolMode;
  /** Requested 1-psi waiver. Only applied when the blend is E10 and the class is 9.0. */
  rvpWaiver: boolean;
  /** Published pipe / NOM receipt. Overlay never writes this. */
  pipeSpecs: ProductSpecs;
  /** Rack / finished. Overlay 10 ppm S / 0.62% benzene is this row only. */
  finishedSpecs: ProductSpecs;
  /** Limits the LP is using (pipe unless overlay is on for US CBOB). */
  specs: ProductSpecs;
  inventoryBbl: number;
  capacityBbl: number;
  heelBbl: number;
  heel: HeelQuality;
  demandBbl: number;
  rackPricePerBbl: number;
  /** Pipeline tariff or export freight, dollars per finished gallon */
  freightPerGal: number;
  /** Which Platts GC rack this tank uses. Midgrade / SFPP / Mexico stay manual. */
  rackProduct?: RackProduct;
  rackStale?: boolean;
  rackMarksLabel?: string;
}

export interface RvoSettings {
  enabled: boolean;
  /** Fraction of hydrocarbon gasoline gallons that must be covered by RINs */
  obligationRate: number;
  /** D6 RIN price, $ per RIN */
  d6RinPrice: number;
  /** Raw D6 from Platts Daily, cents per RIN. */
  d6Cts?: number | null;
  d6Stale?: boolean;
  /** RINs generated per neat ethanol gallon */
  ethanolRinsPerGal: number;
  /** Volume fraction of denaturant in denatured ethanol. RINs are credited after this haircut. */
  denaturantVolFrac: number;
}

export interface Plant {
  tanks: ProductTank[];
  components: Blendstock[];
  rvo: RvoSettings;
  /**
   * When on, FINISHED US CBOB uses Tier 3 10 ppm S / MSAT2 0.62 vol% benzene.
   * Pipe receipt is unchanged. Default off — a Colonial lift uses the pipe tariff.
   */
  complianceOverlay: boolean;
  marks: DailyMarks;
  /** Previous Platts Daily Date row. Weekend/holiday = last settlement, not a fabricated Sunday. */
  priorMarks: DailyMarks | null;
  marksLoadState: MarksLoadState;
  marksLoadError: string | null;
  componentBook: ComponentBookRow[];
  bookLoadState: MarksLoadState;
  bookLoadError: string | null;
  /** DON'T LIFT when book − implied exceeds this, $/bbl. */
  liftEpsilonPerBbl: number;
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
  ethanolVolPct: number;
}

export type SpecSense = "min" | "max";
export type SpecStatus = "pass" | "fail" | "idle" | "batch";

export interface SpecCheck {
  id: string;
  label: string;
  unit: string;
  value: number;
  limit: number | null;
  pipeLimit: number | null;
  finishedLimit: number | null;
  sense: SpecSense;
  slack: number | null;
  status: SpecStatus;
  binding: boolean;
  blendRule: string;
  layer: SpecLayer;
}

export interface Recipe {
  volumes: Record<BlendstockId, number>;
}

export interface MultiRecipe {
  /** barrels[tankId][componentId] */
  barrels: Record<TankId, Record<BlendstockId, number>>;
}

export type SolverStatus = "optimal" | "infeasible" | "unbounded" | "idle";

export interface BonUsed {
  id: string;
  name: string;
  streamKey: StreamKey;
  blendingRon: number;
  blendingMon: number;
  note: string;
}

export interface TankSolve {
  tankId: TankId;
  recipe: Recipe;
  barrels: Record<BlendstockId, number>;
  properties: BlendProperties | null;
  cleanBatch: boolean;
  mixedFails: boolean;
  failReasons: string[];
  lpRvpLimit: number;
  rvpClassPsi: number;
  waiverApplied: boolean;
  bonsUsed: BonUsed[];
}

export interface OptimizeResult {
  status: SolverStatus;
  recipe: Recipe;
  objective: number | null;
  message: string;
}

export interface BindingConstraint {
  name: string;
  label: string;
}

export interface RelaxSuggestion {
  id: string;
  label: string;
  feasible: boolean;
  extraCost: number | null;
}

export interface PlantSolve {
  status: SolverStatus;
  message: string;
  recipe: MultiRecipe;
  tanks: TankSolve[];
  componentUsedBbl: Record<BlendstockId, number>;
  blendCost: number | null;
  revenue: number | null;
  rvoObligation: number | null;
  rvoCredit: number | null;
  rvoCost: number | null;
  rvoObligationPerBbl: number | null;
  rvoCreditPerBbl: number | null;
  rvoNetPerBbl: number | null;
  freightCost: number | null;
  margin: number | null;
  /** LP indifference $/bbl for each component, same number the naphtha seek uses. */
  impliedValues: Record<string, number | null>;
  bindingConstraints: BindingConstraint[];
  relaxOptions: RelaxSuggestion[];
  cheapestRelax: RelaxSuggestion | null;
}

export interface QualityDebit {
  id: string;
  label: string;
  amount: number;
  note: string;
  /** Always heuristic. The bid is impliedValue from the plant LP. */
  heuristic: true;
}

export interface ComponentSeekResult {
  regionId: RegionId;
  componentId: string;
  streamKey: StreamKey;
  name: string;
  kind: Exclude<NaphthaKind, null> | null;
  /** Offer and implied value are dollars per barrel internally */
  offerPrice: number;
  impliedValue: number | null;
  impliedSource: "lp";
  clears: boolean;
  usedBbl: number;
  destination: Partial<Record<TankId, number>>;
  debits: QualityDebit[];
  message: string;
}

export type NaphthaSeekResult = ComponentSeekResult;
