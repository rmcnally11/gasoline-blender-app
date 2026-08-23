"use client";

import { formatNumber, formatPerGal, perGallon } from "@/lib/blend";
import { usePlant } from "./plant-context";

export function EconomicsStrip() {
  const { solve, solverStatus, finishedBbl } = usePlant();
  const gallons = finishedBbl * 42;
  const revenue = perGallon(solve.revenue, finishedBbl);
  const blend = perGallon(solve.blendCost, finishedBbl);
  const rvo = perGallon(solve.rvoCost, finishedBbl);
  const margin = perGallon(solve.margin, finishedBbl);

  return (
    <section className="rounded-xl border border-border bg-card/80 p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Plant economics</h2>
          <p className="text-xs text-muted-foreground">
            {solverStatus === "optimal"
              ? `Rack, blend, RVO, and margin on ${formatNumber(gallons, 0)} finished gallons.`
              : "Press Solve plant. Totals show as dollars per finished gallon, not a notional header."}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Rack" value={formatPerGal(revenue)} hint="Weighted tank rack" />
        <Metric label="Blend cost" value={formatPerGal(blend)} hint="Components into the three tanks" />
        <Metric label="RVO net" value={formatPerGal(rvo)} hint="Obligation − ethanol RINs" />
        <Metric
          label="Margin"
          value={formatPerGal(margin)}
          hint={margin !== null && margin >= 0 ? "Over rack after RVO" : "Under rack"}
          tone={margin === null ? "muted" : margin >= 0 ? "good" : "bad"}
        />
      </dl>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "muted" | "good" | "bad";
}) {
  const hintClass = {
    muted: "text-muted-foreground",
    good: "text-emerald-800",
    bad: "text-red-700",
  }[tone];
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-lg tabular-nums">{value}</dd>
      <p className={`text-[11px] ${hintClass}`}>{hint}</p>
    </div>
  );
}
