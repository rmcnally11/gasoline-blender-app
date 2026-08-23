"use client";

import { formatMoney, formatNumber, formatPerGal, perGallon } from "@/lib/blend";
import { TermTip } from "./term-tip";
import { usePlant } from "./plant-context";

export function EconomicsStrip() {
  const { solve, solverStatus, finishedBbl } = usePlant();
  const gallons = finishedBbl * 42;
  const marker = perGallon(solve.revenue, finishedBbl);
  const blend = perGallon(solve.blendCost, finishedBbl);
  const freight = perGallon(solve.freightCost, finishedBbl);
  const margin = perGallon(solve.margin, finishedBbl);

  return (
    <section className="rounded-xl border border-border bg-card/80 p-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Netback versus destination</h2>
          <p className="text-xs text-muted-foreground">
            {solverStatus === "optimal"
              ? `Marker, components, and freight on ${formatNumber(gallons, 0)} finished gallons. RFS is booked in $/bbl below.`
              : "Press Solve plant. Marker, components, and freight are $/gal. RFS is three $/bbl numbers."}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric
          label={<TermTip term="destinationMarker">Marker</TermTip>}
          value={formatPerGal(marker)}
          hint="Fungible / export"
        />
        <Metric
          label={<TermTip term="book">Components</TermTip>}
          value={formatPerGal(blend)}
          hint="New barrels into the lift"
        />
        <Metric
          label={<TermTip term="freight">Freight</TermTip>}
          value={formatPerGal(freight)}
          hint="Pipeline tariff or export"
        />
        <Metric
          label="Net"
          value={formatPerGal(margin)}
          hint={margin !== null && margin >= 0 ? "Beats buying the barrel" : "Worse than the marker"}
          tone={margin === null ? "muted" : margin >= 0 ? "good" : "bad"}
        />
      </dl>
      <div className="mt-3">
        <h3 className="text-xs font-medium">RFS book, $/bbl</h3>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Obligation on hydrocarbon gallons only. Ethanol RINs after denaturant. Mexico / export tanks
          are not charged.
        </p>
        <dl className="grid grid-cols-3 gap-2">
          <Metric
            label="Obligation"
            value={formatMoney(solve.rvoObligationPerBbl, 3)}
            hint="$/bbl hydrocarbon RVO"
          />
          <Metric
            label="RIN credit"
            value={formatMoney(solve.rvoCreditPerBbl, 3)}
            hint="$/bbl neat ethanol RINs"
          />
          <Metric
            label="RFS net"
            value={formatMoney(solve.rvoNetPerBbl, 3)}
            hint="Obligation − credit"
            tone={
              solve.rvoNetPerBbl === null ? "muted" : solve.rvoNetPerBbl <= 0 ? "good" : "bad"
            }
          />
        </dl>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: React.ReactNode;
  value: string;
  hint: string;
  tone?: "muted" | "good" | "bad";
}) {
  const hintClass = {
    muted: "text-muted-foreground",
    good: "text-teal-800",
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
