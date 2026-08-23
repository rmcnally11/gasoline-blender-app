"use client";

import Link from "next/link";
import { componentsForRegion, regionLabel } from "@/lib/blend";
import { BlendBoard } from "./blend-board";
import { EconomicsStrip } from "./economics-strip";
import { MarketValues } from "./market-values";
import { MarksCompare } from "./marks-compare";
import { MarksHeader } from "./marks-header";
import { MobileWorkspace } from "./mobile-workspace";
import { MoneyScreen } from "./money-screen";
import { usePlant } from "./plant-context";
import { RegionSwitcher } from "./region-switcher";

export function PlantDesk() {
  const { plant, activeRegion, setActiveRegion, seeks, busy, runSeek } = usePlant();

  const destinations = (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Which destination</h2>
        <p className="text-xs text-muted-foreground">
          Colonial, Explorer, West Coast, and Mexico are separate books. Type the components on{" "}
          <Link href="/inputs" className="text-sky-800 underline underline-offset-2">
            Inputs
          </Link>
          . This page is the P&L after Solve.
        </p>
      </div>
      <RegionSwitcher plant={plant} value={activeRegion} onChange={setActiveRegion} />
    </section>
  );

  const seek = (
    <MarketValues
      regionLabel={regionLabel(activeRegion)}
      components={componentsForRegion(plant.components, activeRegion)}
      seeks={seeks}
      busy={busy === "seek"}
      editPrices={false}
      onSeek={runSeek}
    />
  );

  return (
    <MobileWorkspace
      forceTabs
      storageKey="plant"
      defaultSection="pnl"
      sections={[
        {
          id: "pnl",
          label: "P&L",
          content: (
            <>
              <MarksHeader />
              <MarksCompare />
              <EconomicsStrip />
              <MoneyScreen />
            </>
          ),
        },
        {
          id: "blends",
          label: "Blends",
          content: (
            <>
              <MarksHeader />
              <BlendBoard />
            </>
          ),
        },
        {
          id: "bids",
          label: "Bids",
          content: (
            <>
              {destinations}
              {seek}
            </>
          ),
        },
      ]}
    />
  );
}
