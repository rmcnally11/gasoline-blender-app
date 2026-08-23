export type GlossaryEntry = {
  term: string;
  short: string;
  long: string;
};

export const GLOSSARY = {
  aki: {
    term: "AKI",
    short: "(RON + MON) / 2. The octane the ticket usually cites as “pump octane.”",
    long: "Anti-Knock Index. The LP’s octane constraint is this number unless a slate also has a separate RON or MON floor. Ethanol and FCC use blending octane, not neat, in the mix.",
  },
  basisCpg: {
    term: "Basis, cpg",
    short: "Cents per gallon versus GC CBOB. Book = GC CBOB $/bbl + basis × 0.42. Empty is not a typical spread.",
    long: "You type this in Airtable Component Book (or locally). It is not a Platts alk/FCC code. If both basis and override are empty, that stream stays stale — the model will not invent a typical alkylate or FCC differential.",
  },
  binding: {
    term: "Binding",
    short: "A limit the recipe is sitting on — AKI, RVP, sulfur, benzene, inventory, or capacity.",
    long: "After Solve, the money screen names what is tight. If the plant is infeasible, binding constraints are why there is no recipe. That is not a zero blend.",
  },
  book: {
    term: "Book $/bbl",
    short: "What you pay for the stream. Override wins; else GC CBOB + basis × 0.42.",
    long: "The LP spends this number. LIFT compares book to implied. A toy default assay is not a book — DON’T LIFT until you have basis, override, Platts, or a price you typed.",
  },
  bookMinusImplied: {
    term: "Book − implied",
    short: "Positive means the stream is dear versus the header. Past the lift cut → DON’T LIFT.",
    long: "Same units as book, $/bbl. If implied is more than the lift cut below book, the call is DON’T LIFT. Within the cut, LIFT.",
  },
  capacity: {
    term: "Capacity, bbl",
    short: "Tank shell. Heel + new barrels cannot exceed this.",
    long: "Ship volume is the mixed tank after the lift. Capacity is the hard top. If ship volume is above capacity, Solve is infeasible.",
  },
  cleanBatch: {
    term: "Clean batch",
    short: "Zero heel. Math only — it will not print On spec.",
    long: "A thought experiment: blend only new components. Useful for a quality check. It is not a tank ticket.",
  },
  componentBook: {
    term: "Component Book",
    short: "The seven streams Platts Daily does not print: nC4, FCC, reformate, alk, isomerate, LSR, heavy naphtha.",
    long: "Same Airtable base as Platts Daily. Fields: streamKey, name, basisCpg, overridePerBbl, notes. Refresh pulls them onto Inputs. Local edits are typed until the next pull.",
  },
  destinationMarker: {
    term: "Destination marker, $/gal",
    short: "What you sell the finished barrel for at the rack or export. You type $/gal; the LP uses × 42.",
    long: "On US CBOB tanks this can follow GC CBOB, Unl87, or CBOB93 from Platts Daily. Midgrade, SFPP, and Mexico stay last typed. Typing here marks the rack manual.",
  },
  d6: {
    term: "D6 RIN",
    short: "Platts Daily is cents per RIN. The model uses $ per RIN (cts / 100) in RVO. Not × 0.42.",
    long: "RVO $ = obligation rate × 42 gal/bbl × D6 $/RIN on hydrocarbon barrels, minus RIN credit on neat ethanol. Dummy $0.85 is never labeled Platts.",
  },
  debitCard: {
    term: "Debit card",
    short: "A heuristic quality haircut on the naphtha seek. It is not the bid.",
    long: "The bid is the LP implied on Plant. If a benzene or RVO card appears on Bids, treat it as a reminder, not a market.",
  },
  denaturant: {
    term: "Ethanol denaturant, vol%",
    short: "Cut of the ethanol splash that is hydrocarbon. RINs are credited on the neat remainder only.",
    long: "Default 2%. Obligation still hits the denaturant gallons. Mexico tanks are not charged RFS.",
  },
  dontLift: {
    term: "DON’T LIFT",
    short: "Implied is more than the lift cut below book, or the only price is a toy default.",
    long: "The recipe may still take barrels (must-use, octane need). The call is the bid screen, not a hard LP block. Fix the book or pass on the stream.",
  },
  leftover: {
    term: "Enabled, zero barrels in the recipe",
    short: "Same barrels table, 0 in P1/P2/P3. Use is on and inventory is sitting. Not a LIFT call.",
    long: "LIFT / DON’T LIFT is only for streams the recipe used. A Not used row means the header left the inventory in the tank — too dear, wrong quality, or the lift was already full of cheaper barrels.",
  },
  ethanolMode: {
    term: "Ethanol",
    short: "E0 = no ethanol. E10 = lock 10 vol%. Flex = 0–10%.",
    long: "E10 is what the 1-psi RVP waiver can apply to, and only in a true 9.0 class. Ethanol price comes from Chicago ethanol on Platts Daily when that field is live.",
  },
  finished: {
    term: "Finished spec",
    short: "What you must hit at the rack after splash. Overlay writes this row only.",
    long: "Pipe receipt is unchanged when you turn Tier 3 / MSAT2 on. A Colonial lift uses pipe CBOB until overlay is on.",
  },
  freight: {
    term: "Freight / tariff, $/gal",
    short: "Pipeline tariff or export freight on finished gallons. Subtracted from margin.",
    long: "You type $/gal. Dollars on the lift = freight × 42 × ship volume. Defaults follow the slate; you can override.",
  },
  frozenRecipe: {
    term: "Frozen recipe",
    short: "After Solve, Refresh reprices the same barrels. It does not run two different plants.",
    long: "Yesterday vs today uses the latest Platts Daily Date and the previous Date on those barrels. Weekend/holiday prior is the last settlement (e.g. Friday). No Sunday print is invented.",
  },
  gcCbob: {
    term: "GC CBOB",
    short: "Gulf Coast CBOB rack from Platts Daily: RB + GC_CBOB_Diff, then × 0.42 = $/bbl.",
    long: "US CBOB Regular tanks use this as the destination marker unless you pick Unl87, CBOB93, or manual. Component basis is versus this number.",
  },
  grade: {
    term: "Grade",
    short: "Regular, midgrade, or premium. Sets octane floors and the default GC rack product.",
    long: "Premium US CBOB defaults to GC CBOB93. Midgrade stays a typed rack. Grade does not change which regional pool the tank draws.",
  },
  heel: {
    term: "Heel",
    short: "Barrels already in the tank, with a fixed quality. Blend = heel + new components.",
    long: "Heel cannot exceed ship volume or opening inventory. A dirty heel can fail the mixed tank even if a clean batch would pass. Zero heel is a clean-batch experiment, not On spec.",
  },
  implied: {
    term: "Implied $/bbl",
    short: "LP indifference price — same dual the naphtha seek uses. That is the bid.",
    long: "What the header would pay for one more barrel of that stream, given the current recipe, specs, and the rest of the book. Not a debit-card heuristic.",
  },
  inventory: {
    term: "Inv bbl / inventory",
    short: "Barrels of that stream you can lift across the plant. Shared by every tank in the region.",
    long: "Must-use is a floor on the same pile. Max lift starts at inventory. Colonial and Explorer are different books — P1 and P3 share Colonial inventory.",
  },
  lift: {
    term: "LIFT",
    short: "Implied covers book within the lift cut, and the price is not a toy default.",
    long: "A bid to take the stream. The LP may already be using it. If the call is LIFT and you are long, that is the header saying the barrels earn.",
  },
  liftCut: {
    term: "Lift cut, $/bbl",
    short: "DON’T LIFT if implied is more than this below book. Default $0.25/bbl.",
    long: "Also labeled lift epsilon on the Component Book card. It does not change the recipe. It only changes the LIFT / DON’T LIFT call.",
  },
  marks: {
    term: "Marks",
    short: "Latest Platts Daily gasoline row: RB, GC CBOB / Unl87 / CBOB93, Chicago ethanol, D6.",
    long: "Empty fields stay last typed and show stale / missing. Dummy $104.16 rack / $0.85 RIN are never labeled Platts. Refresh pulls the latest Date and the previous Date for the compare.",
  },
  marketGal: {
    term: "Market $/gal",
    short: "Local typed price for that stream. Converts × 42 for the LP. Labeled typed.",
    long: "Typing here overrides the Component Book until you Refresh Airtable. Ethanol can also come from Platts (Chicago). Do not treat a default assay as a market.",
  },
  mixedTank: {
    term: "Mixed tank",
    short: "Heel + new components after the lift. This is what must be on spec.",
    long: "Ship volume is this mixed barrel. If the mix fails, the ticket is not on spec even if the new-only blend would have passed.",
  },
  mustUse: {
    term: "Must-use, bbl",
    short: "Minimum barrels of this stream the plant must take. 0 means optional.",
    long: "A floor on the regional book, not a wish. If you must-use 2,000 bbl of FCC, Solve will force those barrels into enabled tanks or go infeasible. It is not “should use” and it is not inventory.",
  },
  naphthaSeek: {
    term: "Value versus destination",
    short: "Goal-seek on Plant Bids. Same implied as the P&L. Debit cards are not the bid.",
    long: "Light and heavy naphtha, plus the rest of the regional book, versus the destination you set on the tanks.",
  },
  openingInventory: {
    term: "Opening inventory, bbl",
    short: "What is already in the product tank before the lift, including the heel.",
    long: "Heel cannot be larger than this. Capacity minus opening leftover room is what you can add.",
  },
  overlay: {
    term: "Finished overlay (Tier 3 / MSAT2)",
    short: "10 ppm S / 0.62% benzene on the FINISHED row only. Pipe CBOB stays 80 ppm / 3.8%.",
    long: "Starts off. A default Regular E10 Colonial lift uses pipe receipt. Turning overlay off does not change the pipe tariff.",
  },
  override: {
    term: "Override $/bbl",
    short: "Absolute book. Wins over basis. Empty + empty basis = stale.",
    long: "Type in Airtable or locally. Use this when the stream is not a CBOB-related barrel (or you have a firm offer). It does not invent a Platts component code.",
  },
  pipe: {
    term: "Pipe receipt",
    short: "What Colonial / Explorer / SFPP / Mexico will take into the line.",
    long: "Always visible next to finished. Overlay never writes this row. Default Colonial Regular uses this tariff until you turn overlay on.",
  },
  priorSettlement: {
    term: "Prior settlement",
    short: "The previous Platts Daily Date row. Friday if Saturday/Sunday have no print.",
    long: "Labeled with that row’s Date. The compare does not fabricate a weekend Platts print. If only one row exists, there is no prior.",
  },
  rackProduct: {
    term: "GC rack product",
    short: "Which Platts GC gasoline prices this tank’s marker: CBOB, Unl87, CBOB93, or manual.",
    long: "SFPP and Mexico cannot take a GC CBOB rack — they stay last typed. Typing the destination marker yourself sets manual.",
  },
  rfs: {
    term: "RFS / RVO",
    short: "Obligation on hydrocarbon gallons. Credit RINs on neat ethanol after denaturant. Mexico off.",
    long: "Three $/bbl numbers: obligation, RIN credit, net. D6 from Platts Daily is cts/RIN → $/RIN. Toggle off to drop RFS from the objective.",
  },
  rvoRate: {
    term: "RVO rate, %",
    short: "Share of hydrocarbon gallons that must be covered by RINs.",
    long: "Obligation $ per hydrocarbon barrel = rate × 42 × D6 $/RIN. Ethanol gallons are not obligated; the denaturant cut is.",
  },
  rvpClass: {
    term: "Season / RVP class",
    short: "The area class (7.8, 9.0, 11.5, …). CBOB class and finished E10 RVP are separate.",
    long: "The LP uses the number shown after waiver logic. A 1-psi waiver never inflates a 7.8 class. Only E10 in a true 9.0 class can get +1 on finished.",
  },
  rvpWaiver: {
    term: "1-psi waiver",
    short: "Finished E10 in a 9.0 class only. Pipe CBOB unchanged. Not 7.8.",
    long: "You can request it; the model applies it only when ethanol is locked E10 and the class is actually 9.0. Off means finished stays at class.",
  },
  slack: {
    term: "Slack",
    short: "Room to the spec the LP is using. Binding means slack is about zero.",
    long: "On a min spec (AKI) slack is blend − limit. On a max spec (RVP, S, benzene) slack is limit − blend. The Blends tab shows this for the mixed tank after Solve.",
  },
  shipVolume: {
    term: "Ship volume, bbl",
    short: "Finished barrels in the mixed tank — heel plus new. This is the lift size.",
    long: "Revenue = destination marker × ship volume. Must be ≥ heel and ≤ capacity. New components = ship volume − heel.",
  },
  slate: {
    term: "Spec slate / region",
    short: "Destination and pool: CPL CBOB, Explorer, SFPP, Mexico ZMVM or resto.",
    long: "Picks the spec book and which component list the tank may draw. P1 and P3 can both sit on Colonial and share that book. Mexico ZMVM and resto share one Mexico pool. No RFS on Mexico.",
  },
  source: {
    term: "Source",
    short: "airtable = pulled from the Component Book table. typed = you edited locally. stale = empty basis and override.",
    long: "Refresh overwrites typed with Airtable. A fetch failure is printed — dummy assay prices are not the book. Empty Airtable cells stay stale, not a typical alk/FCC.",
  },
  stale: {
    term: "Stale / missing",
    short: "No live Platts or book number. Last typed stays; it is not a dummy default dressed up as Platts.",
    long: "Empty Platts fields, empty Component Book basis/override, or a failed Airtable pull. LIFT will not treat a toy default as a bid.",
  },
  stream: {
    term: "Stream",
    short: "One blendstock in a regional book (Colonial FCC, Explorer alk, …).",
    long: "streamKey is the Component Book key (fcc, alkylate, lsr, …) and must stay exact. The same key can exist in more than one region; inventory does not cross regions.",
  },
  use: {
    term: "Use",
    short: "Include this stream in the LP. Off = the header cannot buy it.",
    long: "Must-use on a disabled stream is ignored because the stream is not in the pool. Turn Use on if you need those barrels.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;

export function glossaryList(): { key: GlossaryKey; entry: GlossaryEntry }[] {
  return (Object.keys(GLOSSARY) as GlossaryKey[])
    .map((key) => ({ key, entry: GLOSSARY[key] }))
    .sort((a, b) => a.entry.term.localeCompare(b.entry.term));
}
