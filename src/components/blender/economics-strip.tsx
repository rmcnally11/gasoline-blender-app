"use client";

import { formatNumber, formatPerGal, perGallon } from "@/lib/blend";
import { usePlant } from "./plant-context";

export function EconomicsStrip() {
  const { solve, solverStatus, finishedBbl } = usePlant();
  const gallons = finishedBbl * 42;
  const marker = perGallon(solve.revenue, finishedBbl);
  const blend = perGallon(solve.blendCost, finishedBbl);
  const rvo = perGallon(solve.rvoCost, finishedBbl);
  const freight = perGallon(solve.freightCost, finishedBbl);
  const margin = perGallon(solve.margin, finishedBbl);

  return (
    <section className="rounded-xl border border-border bg-card/80 p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Netback versus destination</h2>
          <p className="text-xs text-muted-foreground">
            {solverStatus === "optimal"
              ? `Marker, components, RVO, and freight on ${formatNumber(gallons, 0)} finished gallons.`
              : "Press Solve plant. Everything here is dollars per finished gallon."}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Metric label="Marker" value={formatPerGal(marker)} hint="Fungible / export" />
        <Metric label="Components" value={formatPerGal(blend)} hint="Market cost into the lift" />
        <Metric label="RVO net" value={formatPerGal(rvo)} hint="Obligation − ethanol RINs" />
        <Metric label="Freight" value={formatPerGal(freight)} hint="Pipeline tariff or export" />
        <Metric
          label="Net"
          value={formatPerGal(margin)}
          hint={margin !== null && margin >= 0 ? "Beats buying the barrel" : "Worse than the marker"}
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
