"use client";

import Link from "next/link";
import { GLOSSARY, glossaryList, type GlossaryKey } from "@/lib/glossary";
import { TermTip } from "./term-tip";

const TOC = [
  { href: "#what", label: "What this is" },
  { href: "#pages", label: "Pages" },
  { href: "#units", label: "Units" },
  { href: "#session", label: "A session" },
  { href: "#fields", label: "Every field" },
  { href: "#marks", label: "Marks" },
  { href: "#book", label: "Component book" },
  { href: "#money", label: "P&L and bids" },
  { href: "#tanks", label: "P1 / P2 / P3" },
  { href: "#specs", label: "Specs and RVP" },
  { href: "#rfs", label: "RFS" },
  { href: "#destinations", label: "Destinations" },
  { href: "#infeasible", label: "No solve" },
  { href: "#glossary", label: "Glossary" },
] as const;

export function UserManual() {
  return (
    <article className="space-y-10 overflow-x-clip text-sm leading-6 break-words text-foreground">
      <p className="text-muted-foreground">
        Hover (or tap) any dotted term on this page or on Inputs / Plant / the tanks. The same
        short definition pops up. Full wording is in the{" "}
        <a href="#glossary" className="text-sky-800 underline underline-offset-2">
          glossary
        </a>
        .
      </p>

      <nav className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-sky-800">
        {TOC.map((item) => (
          <a key={item.href} href={item.href} className="underline underline-offset-2">
            {item.label}
          </a>
        ))}
      </nav>

      <section id="what" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">What this tool is for</h2>
        <p className="text-muted-foreground">
          A Gulf Coast products book, not a refinery header. You buy components, blend heel + new
          barrels to a published spec, and ship. You type markets in{" "}
          <strong className="text-foreground">$/gal</strong>. The LP spends{" "}
          <strong className="text-foreground">$/bbl</strong> (× 42). Defaults are a starting assay —
          they are not a price truth.
        </p>
        <p className="text-muted-foreground">
          The bid is the plant LP <TermTip term="implied">implied</TermTip> — the same number the
          naphtha seek uses. A quality debit card, if shown, is a heuristic. It is not the bid.
        </p>
      </section>

      <section id="pages" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">Pages</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <Link href="/" className="text-sky-800 underline underline-offset-2">
              Plant
            </Link>{" "}
            — P&amp;L after Solve, last settlement vs prior on the{" "}
            <TermTip term="frozenRecipe">frozen recipe</TermTip>, Blends (barrels into P1/P2/P3,
            spec slack, dollar stack), and Bids.
          </li>
          <li>
            <Link href="/inputs" className="text-sky-800 underline underline-offset-2">
              Inputs
            </Link>{" "}
            — master book. Rules holds Platts, the{" "}
            <TermTip term="componentBook">Component Book</TermTip>, overlay, and RFS. Colonial /
            Explorer / SFPP / Mexico are the pools. There is not a second book on Plant or the tanks.
          </li>
          <li>
            <Link href="/p1" className="text-sky-800 underline underline-offset-2">
              P1
            </Link>{" "}
            / P2 / P3 — the ticket: grade, slate, heel, marker, freight. Specs is the other room.
          </li>
        </ul>
      </section>

      <section id="units" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">Units</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            You type gasoline in <strong className="text-foreground">$/gal</strong> or{" "}
            <strong className="text-foreground">cpg</strong>. LP and book math are{" "}
            <strong className="text-foreground">$/bbl</strong>.
          </li>
          <li>
            cpg × 0.42 = $/bbl. That is 42 gallons in a barrel, not a Platts factor.
          </li>
          <li>
            <TermTip term="d6">D6</TermTip> is cents per RIN → $ per RIN (divide by 100). It is not
            × 0.42.
          </li>
          <li>
            Basis is cpg versus <TermTip term="gcCbob">GC CBOB</TermTip>. Override is already $/bbl.
          </li>
        </ul>
      </section>

      <section id="session" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">A normal session</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            Open Inputs → Rules. Refresh so Platts Daily and the Component Book land. If the book
            fetch fails, the page says so — do not treat dummy alk as Platts.
          </li>
          <li>
            On each region tab, set <TermTip term="use">Use</TermTip>,{" "}
            <TermTip term="inventory">Inv</TermTip>, and{" "}
            <TermTip term="mustUse">Must-use</TermTip>. Must-use is a floor the plant must take, not
            “should use.”
          </li>
          <li>
            Open the tank that is the lift. Set slate, grade, ethanol, heel,{" "}
            <TermTip term="shipVolume">ship volume</TermTip>, and freight.
          </li>
          <li>
            Press <strong className="text-foreground">Solve plant</strong>. That freezes the recipe.
            Plant P&amp;L is book vs implied and LIFT / DON&apos;T LIFT.
          </li>
          <li>
            Refresh marks to reprice the same barrels on last settlement vs prior. Do not expect a
            second optimize.
          </li>
        </ol>
      </section>

      <section id="fields" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold">Every field on Inputs</h2>
        <dl className="space-y-3">
          <Field term="use" />
          <Field term="inventory" />
          <Field term="mustUse" />
          <Field term="marketGal" />
          <Field term="basisCpg" />
          <Field term="override" />
          <Field term="book" />
          <Field term="source" />
          <Field term="liftCut" />
          <Field term="overlay" />
          <Field term="rfs" />
          <Field term="rvoRate" />
          <Field term="d6" />
          <Field term="denaturant" />
        </dl>
      </section>

      <section id="marks" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">Daily marks</h2>
        <p className="text-muted-foreground">
          <TermTip term="marks">Marks</TermTip> are the latest Platts Daily row (RB, GC CBOB / Unl87
          / CBOB93 diffs, Chicago ethanol, D6). ULSD, jet, CARBOB, NYH, and the rest of that table
          are ignored. An empty cell leaves last typed and flags{" "}
          <TermTip term="stale">stale / missing</TermTip>.
        </p>
        <p className="text-muted-foreground">
          Plant also loads the <TermTip term="priorSettlement">prior settlement</TermTip> Date. The
          compare applies both mark sets to the frozen barrels. If the Component Book is empty, only
          rack / ethanol / RVO move — the line will say component book stale, not that alk traded.
        </p>
      </section>

      <section id="book" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">Component Book</h2>
        <p className="text-muted-foreground">
          Platts Daily does not publish alkylate, FCC, reformate, nC4, isomerate, or naphtha. You
          type those seven <code className="text-foreground">streamKey</code> rows in Airtable:{" "}
          <code className="text-foreground">nbutane</code>, <code className="text-foreground">fcc</code>,{" "}
          <code className="text-foreground">reformate</code>,{" "}
          <code className="text-foreground">alkylate</code>,{" "}
          <code className="text-foreground">isomerate</code>, <code className="text-foreground">lsr</code>,{" "}
          <code className="text-foreground">heavy-naphtha</code>. Those strings must stay exact.
        </p>
        <p className="text-muted-foreground">
          Price rule: <TermTip term="override">override $/bbl</TermTip> wins. Else{" "}
          <TermTip term="gcCbob">GC CBOB</TermTip> $/bbl + <TermTip term="basisCpg">basis cpg</TermTip>{" "}
          × 0.42. Empty + empty = stale. No typical alk/FCC is filled in.
        </p>
      </section>

      <section id="money" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">P&amp;L and bids</h2>
        <p className="text-muted-foreground">
          After Solve: <TermTip term="book">book</TermTip> versus{" "}
          <TermTip term="implied">implied</TermTip>.{" "}
          <TermTip term="lift">LIFT</TermTip> if implied covers book within the{" "}
          <TermTip term="liftCut">lift cut</TermTip>. <TermTip term="dontLift">DON&apos;T LIFT</TermTip>{" "}
          if implied is further below book, or if the only price is a toy default assay.
        </p>
        <p className="text-muted-foreground">
          Netback on the strip is marker − components − freight in $/gal. RFS is the three $/bbl
          numbers under that. Plant Bids → Value versus destination is the same implied.{" "}
          <TermTip term="debitCard">Debit cards</TermTip> are not the bid.
        </p>
      </section>

      <section id="tanks" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold">The ticket (P1 / P2 / P3)</h2>
        <dl className="space-y-3">
          <Field term="grade" />
          <Field term="slate" />
          <Field term="rvpClass" />
          <Field term="ethanolMode" />
          <Field term="rackProduct" />
          <Field term="destinationMarker" />
          <Field term="freight" />
          <Field term="shipVolume" />
          <Field term="openingInventory" />
          <Field term="capacity" />
          <Field term="heel" />
          <Field term="rvpWaiver" />
          <Field term="mixedTank" />
          <Field term="cleanBatch" />
        </dl>
      </section>

      <section id="specs" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">Pipe receipt vs finished, and RVP</h2>
        <p className="text-muted-foreground">
          Two spec rows are always visible. <TermTip term="pipe">Pipe receipt</TermTip> is the line.
          <TermTip term="finished">Finished</TermTip> is the rack.{" "}
          <TermTip term="overlay">Overlay</TermTip> writes finished sulfur / benzene only.
        </p>
        <p className="text-muted-foreground">
          RVP is a money spec. CBOB class and finished E10 RVP are separate. The{" "}
          <TermTip term="rvpWaiver">1-psi waiver</TermTip> applies only if the blend is E10 and the
          class is actually 9.0. It does not inflate 7.8. The page shows the class and the number
          the LP is using.
        </p>
      </section>

      <section id="rfs" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">RFS</h2>
        <p className="text-muted-foreground">
          <TermTip term="rfs">Obligation</TermTip> is on hydrocarbon gallons only. Ethanol RINs are
          credited after the <TermTip term="denaturant">denaturant</TermTip> haircut. Mexico / export
          tanks are not charged. The strip shows obligation, RIN credit, and net as three $/bbl
          numbers.
        </p>
      </section>

      <section id="destinations" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">Destinations</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Colonial / CPL CBOB</strong> — pipe receipt 80 ppm /
            3.8% benzene. Overlay is finished only. P1 and P3 can share this pool.
          </li>
          <li>
            <strong className="text-foreground">Explorer CBOB</strong> — Midwest pipeline, its own
            book. Default P2.
          </li>
          <li>
            <strong className="text-foreground">SFPP West Coast BOB</strong> — published caps.
            Volume-linear D86. Not a certified CARBOB / CaRFG3 V/L check. No GC CBOB rack.
          </li>
          <li>
            <strong className="text-foreground">Mexico ZMVM / resto</strong> — export NOM-016. Same
            Mexico pool. No RFS.
          </li>
        </ul>
      </section>

      <section id="infeasible" className="space-y-2 scroll-mt-24">
        <h2 className="text-lg font-semibold">When the LP cannot solve</h2>
        <p className="text-muted-foreground">
          An infeasible plant does not return a zero recipe. It names the{" "}
          <TermTip term="binding">binding</TermTip> constraints and the cheapest relax among 1 bbl
          alkylate, 0.1 AKI, 1 ppm S, 0.01% benzene, and 0.1 psi. A dirty heel can fail the mixed
          tank even if a clean batch would pass. Typical traps: must-use above inventory, ship
          volume above capacity, heel larger than the lift, or Use off on the only octane stream.
        </p>
      </section>

      <section id="glossary" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold">Glossary</h2>
        <p className="text-muted-foreground">
          Every term the header uses. Hover the name on the working pages for the short line.
        </p>
        <dl className="space-y-4">
          {glossaryList().map(({ key, entry }) => (
            <div key={key} className="border-t border-border/70 pt-3">
              <dt className="font-medium">
                <TermTip term={key}>{entry.term}</TermTip>
              </dt>
              <dd className="text-muted-foreground">{entry.long}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}

function Field({ term }: { term: GlossaryKey }) {
  const entry = GLOSSARY[term];
  return (
    <div>
      <dt className="font-medium">
        <TermTip term={term}>{entry.term}</TermTip>
      </dt>
      <dd className="text-muted-foreground">{entry.long}</dd>
    </div>
  );
}
