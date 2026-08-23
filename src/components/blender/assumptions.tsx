export function Assumptions() {
  return (
    <div className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-2">
      <div>
        <h3 className="mb-1 font-medium text-foreground">What this header is</h3>
        <p>
          P1, P2, and P3 are destination lifts. Each slate is a fungible or export market
          with its own component book. Type markets in $/gal and value them against that
          marker, net of freight and RVO.
        </p>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Spec slates</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>CPL / Explorer CBOB: Colonial and Explorer receipt, D4814 distillation and DI.</li>
          <li>Tier 3 / MSAT2 overlay (default on): 10 ppm sulfur and 0.62 vol% benzene on US CBOB.</li>
          <li>SFPP CARBOB: CaRFG3-style caps — 20 ppm S, 0.80% benzene, T50 220 / T90 330, olefins 10%.</li>
          <li>Mexico NOM-016: ZMVM 30 ppm / 1.0% benzene / 25% aromatics; resto 2.0% benzene / 32% aromatics. Premium AKI 91 and RON 94.</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Blend rules</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Octane, benzene, aromatics, olefins, T10/T50/T90, E200/E300 blend volume-linear.</li>
          <li>RVP uses the Chevron index BI = RVP<sup>1.25</sup>.</li>
          <li>Sulfur and oxygen are mass-weighted.</li>
          <li>Driveability index = 1.5 T10 + 3 T50 + T90 + 2.4 × ethanol vol%.</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Naphtha and RVO</h3>
        <p>
          Goal-seek binary-searches the purchase price until the header stops taking that
          naphtha. Implied value is the most you can pay and still create an on-spec
          domestic barrel. RVO treats each finished gasoline barrel as obligated and credits
          D6 RINs only on ethanol. Naphtha adds obligated gallons and no RINs, so sulfur,
          benzene, octane, DI, and RVO all show up as debits.
        </p>
      </div>
    </div>
  );
}
