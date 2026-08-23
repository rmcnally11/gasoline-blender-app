export function UserManual() {
  return (
    <article className="space-y-8 text-sm leading-6 text-foreground">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What this tool is for</h2>
        <p className="text-muted-foreground">
          A Gulf Coast products book, not a refinery header. You buy components, blend to a
          published spec, and ship. Every price you type is
          <strong className="text-foreground"> $/gal</strong>. Defaults are a starting book —
          you type the assays and the markets.
        </p>
        <p className="text-muted-foreground">
          The destination marker is the fungible or export barrel (CPL CBOB, Explorer, SFPP
          West Coast BOB, Mexico). Implied value is the plant LP indifference price — the same
          number the header uses.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">A normal session</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Open the tank that is the lift (P1 Colonial, P2 Explorer, or switch the slate to Mexico / SFPP).</li>
          <li>Type the <strong className="text-foreground">destination marker</strong> and <strong className="text-foreground">freight / tariff</strong> in $/gal.</li>
          <li>Set heel barrels and heel quality. The mix is heel + new components. Inventory and capacity bound the lift.</li>
          <li>On the component book, mark naphtha you already own with <strong className="text-foreground">must-use bbl</strong>.</li>
          <li>Type market $/gal. Edit BON on ethanol and FCC if your book is different.</li>
          <li>Press <strong className="text-foreground">Value versus destination</strong>. Buy = market ≤ LP implied. The debit card is a heuristic, not the bid.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Pipe receipt vs finished</h2>
        <p className="text-muted-foreground">
          Two spec rows are always visible. Pipe receipt is what Colonial / Explorer / SFPP /
          Mexico will take. Finished is what you must hit at the rack. The default overlay
          (10 ppm S / 0.62% benzene) is finished only and starts off. A default Regular E10
          Colonial lift uses pipe CBOB specs until you turn overlay on. Turning overlay off
          does not change the pipe tariff.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">RVP</h2>
        <p className="text-muted-foreground">
          RVP is a money spec. CBOB RVP and finished E10 RVP are separate. The 1-psi waiver
          applies only if the blend is E10 and the area is actually 9.0. It does not inflate a
          7.8 class. The page shows the RVP class and the number the LP is using.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">RFS</h2>
        <p className="text-muted-foreground">
          Obligation is on hydrocarbon gallons only. Ethanol RINs are credited after the
          denaturant haircut (D6 default). Mexico / export tanks are not charged. The strip
          shows obligation, RIN credit, and net as three $/bbl numbers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">When the LP cannot solve</h2>
        <p className="text-muted-foreground">
          An infeasible plant does not return a zero recipe and a shrug. It names the binding
          constraints and the cheapest relax among 1 bbl alkylate, 0.1 AKI, 1 ppm S, 0.01%
          benzene, and 0.1 psi. A dirty heel can make the mixed tank fail even if a clean
          batch would pass. Zero heel will not print On spec.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Markets</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li><strong className="text-foreground">Colonial / CPL CBOB</strong> — pipe receipt 80 ppm / 3.8% benzene. Overlay is finished only.</li>
          <li><strong className="text-foreground">Explorer CBOB</strong> — Midwest pipeline, its own book.</li>
          <li><strong className="text-foreground">SFPP West Coast BOB</strong> — published caps. Volume-linear D86. Not a certified CARBOB / CaRFG3 V/L check.</li>
          <li><strong className="text-foreground">Mexico ZMVM / resto</strong> — export NOM-016. Same Mexico pool. No RFS.</li>
        </ul>
      </section>
    </article>
  );
}
