export function UserManual() {
  return (
    <article className="space-y-8 text-sm leading-6 text-foreground">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What this tool is</h2>
        <p className="text-muted-foreground">
          A three-tank gasoline blend header. P1, P2, and P3 share one blendstock pool.
          The solver allocates barrels — not just volume percents — so P1, P2, and P3
          compete for alkylate, FCC, ethanol, and naphtha in the same run. Grade is a
          setting on each tank, not the tank’s name.
        </p>
        <p className="text-muted-foreground">
          Use it to price a domestic barrel, see which spec is binding, and decide whether
          a light or heavy naphtha cargo clears after sulfur, benzene, distillation, and RVO.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">A normal session</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Start on <strong className="text-foreground">Plant</strong>. Confirm overlay, RVO rate, and D6 RIN.</li>
          <li>Open the pool table. Put in your inventories and $/bbl. Click the pencil for a full assay.</li>
          <li>Open <strong className="text-foreground">P1</strong>, then P2, then P3. Set grade, slate, season, ethanol lock, and demand.</li>
          <li>Press <strong className="text-foreground">Solve plant</strong>. The header should say “Plant solved.”</li>
          <li>Economics at the top are <strong className="text-foreground">$/gal</strong> on finished gallons, not a notional header.</li>
          <li>On Plant, type a naphtha offer and press <strong className="text-foreground">Goal-seek values</strong>.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Solve plant</h2>
        <p className="text-muted-foreground">
          Solve allocates the shared pool into every enabled tank at once. Tank grade, slate,
          season, ethanol, demand, overlay, and RVO re-solve immediately. Assay and spec-limit
          edits wait — the yellow note says so — until you press Solve plant.
        </p>
        <p className="text-muted-foreground">
          If nothing seems to happen, look at the line under the title. It should change to
          “Plant solved” or “edits waiting.” The button itself switches to “Solving…” while
          the LP runs. If a case is impossible, a red banner explains that no allocation fits
          the inventories and slates.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Naphtha goal-seek</h2>
        <p className="text-muted-foreground">
          Type the cargo or tank offer in $/bbl. Goal-seek finds the highest price at which
          the header still takes that naphtha into an on-spec domestic barrel. That price is
          implied blend value.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>If offer ≤ implied value and barrels are taken, it <strong className="text-foreground">creates a domestic barrel</strong>.</li>
          <li>If not, the debit table shows octane, sulfur, benzene, distillation/DI, and RVO.</li>
          <li>Naphtha adds obligated gasoline gallons and no D6 RINs. That is why RVO is a debit.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Economics, $/gal</h2>
        <p className="text-muted-foreground">
          Rack, blend cost, RVO net, and margin are plant totals divided by finished gallons
          (enabled tank demand × 42). A tank page also shows that tank’s blend cost in $/gal.
          This is a working blender, not a P&amp;L — freight, additives, and tax are out.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Spec slates</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li><strong className="text-foreground">CPL / Explorer CBOB</strong> — pipeline receipt plus D4814 distillation and DI. Overlay (default on) tightens sulfur to 10 ppm and benzene to 0.62 vol%.</li>
          <li><strong className="text-foreground">SFPP CARBOB</strong> — CaRFG3-style caps: 20 ppm S, 0.80% benzene, T50 220 / T90 330, olefins 10%.</li>
          <li><strong className="text-foreground">Mexico ZMVM</strong> — NOM-016 CDMX: 30 ppm S, 1.0% benzene, 25% aromatics. Premium RON 94 / AKI 91. E0 default.</li>
          <li><strong className="text-foreground">Mexico resto</strong> — 2.0% benzene, 32% aromatics.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Blend rules</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Octane numbers are blending octanes, volume-linear.</li>
          <li>RVP uses the Chevron index BI = RVP<sup>1.25</sup>.</li>
          <li>Sulfur and oxygen are mass-weighted.</li>
          <li>DI = 1.5 T10 + 3 T50 + T90 + 2.4 × ethanol vol%.</li>
          <li>Ethanol RVP of 18 psi is a splash-blend approximation for the E10 bump.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What it will not do</h2>
        <p className="text-muted-foreground">
          It will not replace a certified cert, a pipeline ticket, or your linear-program
          blending system. Defaults are Gulf-Coast-style demo assays. Put your real streams
          and prices in before you trust a naphtha bid. RVO here is a single D6 obligation,
          not the full nested RFS.
        </p>
      </section>
    </article>
  );
}
