export function Assumptions() {
  return (
    <div className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-2">
      <div>
        <h3 className="mb-1 font-medium text-foreground">What this header is</h3>
        <p>
          P1, P2, and P3 are destination lifts. Each slate is a fungible or export market
          with its own component book. Type markets in $/gal and value them against that
          marker, net of freight and RFS. The tank is heel + new components, not a clean batch.
        </p>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Two spec rows</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Pipe receipt: Colonial / Explorer CBOB 80 ppm S, 3.8 vol% benzene, published RVP class.</li>
          <li>Finished overlay (default off): 10 ppm S / 0.62 vol% benzene on the rack row only. Turning it off does not change the pipe tariff.</li>
          <li>SFPP West Coast BOB uses published caps. D86 T50/T90/DI are volume-linear approximations — not a CaRFG3 V/L or certified CARBOB check.</li>
          <li>Mexico NOM-016: ZMVM and resto. Export — no RFS.</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Blend rules</h3>
        <ul className="list-disc space-y-1 pl-4">
          <li>Octane uses blending octane numbers. Ethanol has a BON plus an E10 synergy. FCC BON is editable. Alkylate vs FCC will flip if those numbers or prices change.</li>
          <li>RVP uses the Chevron index BI = RVP<sup>1.25</sup>. CBOB class and finished E10 are separate. The 1-psi waiver applies only to E10 in a true 9.0 class. No 8.8 hack on Colonial 7.8.</li>
          <li>Sulfur and oxygen are mass-weighted. Distillation is volume-linear D86.</li>
        </ul>
      </div>
      <div>
        <h3 className="mb-1 font-medium text-foreground">Naphtha and RFS</h3>
        <p>
          Goal-seek uses the same plant LP implied value as the header — the indifference
          price, not a debit card. Any quality card is labeled heuristic and is not the bid.
          RFS obligation is on hydrocarbon gallons. Ethanol RINs are credited after denaturant.
          Mexico / export tanks are not charged.
        </p>
      </div>
    </div>
  );
}
