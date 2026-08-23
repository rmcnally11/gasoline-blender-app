export function UserManual() {
  return (
    <article className="space-y-8 text-sm leading-6 text-foreground">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What this tool is for</h2>
        <p className="text-muted-foreground">
          A Gulf Coast products book, not a refinery header. You have naphtha in tank — or a
          naphtha bid — and you want to know whether you can buy other components, blend to a
          domestic or export spec, and ship on the pipeline or water. Every price you type is
          <strong className="text-foreground"> $/gal</strong>.
        </p>
        <p className="text-muted-foreground">
          The destination marker is the fungible or export barrel (CPL CBOB, Explorer, SFPP
          CARBOB, Mexico). Implied value is the most you can pay for a component and still beat
          buying that barrel, after quality, RVO, and freight.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">A normal session</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Open the tank that is the lift (P1 Colonial, P2 Explorer, or switch the slate to Mexico / SFPP).</li>
          <li>Type the <strong className="text-foreground">destination marker</strong> and <strong className="text-foreground">freight / tariff</strong> in $/gal.</li>
          <li>On the component book, mark naphtha you already own with <strong className="text-foreground">must-use bbl</strong>.</li>
          <li>Type market $/gal for alkylate, reformate, isooctane, FCC, butane, ethanol, the rest.</li>
          <li>Press <strong className="text-foreground">Value versus destination</strong>. Buy = market ≤ implied. Pass = too rich versus the marker.</li>
          <li>Netback at the top is marker − components − RVO − freight, in $/gal.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How to read Buy / Pass</h2>
        <p className="text-muted-foreground">
          Implied is a goal-seek: the highest $/gal at which the LP still takes that stream into
          an on-spec lift. If your market is below that, blending it in is cheaper than filling
          the barrel with other streams. If your market is above it, sell it or leave it — the
          fungible barrel wins.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li><strong className="text-foreground">Naphtha tanks</strong> — set must-use to the barrels you have to place. Then value what you can buy to blend them up to spec.</li>
          <li><strong className="text-foreground">Purchase offers</strong> — leave must-use at 0 and type the offer in market $/gal.</li>
          <li><strong className="text-foreground">Ethanol</strong> — E10 splash is locked on US tanks. It is not a bid/offer seek.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Markets</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li><strong className="text-foreground">Colonial / CPL CBOB</strong> — fungible pipeline. Overlay (default on) is Tier 3 10 ppm and MSAT2 0.62% benzene.</li>
          <li><strong className="text-foreground">Explorer CBOB</strong> — Midwest pipeline, its own book.</li>
          <li><strong className="text-foreground">SFPP CARBOB</strong> — West Coast / CaRFG3-style caps.</li>
          <li><strong className="text-foreground">Mexico ZMVM / resto</strong> — export NOM-016. Same Mexico pool, different specs. E0 default.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What it will not do yet</h2>
        <p className="text-muted-foreground">
          It does not pull Platts/Argus, cycle timing, or dock vs Pasadena vs Magellan
          location. Freight is one number per lift, not a full tariff table. RVO is a single D6
          obligation, not nested RFS. Defaults are demo assays — put your tank quality and
          today&apos;s markets in before you bid.
        </p>
      </section>
    </article>
  );
}
