"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatNumber, formatPerGal, perGalFromBbl } from "@/lib/blend";
import { rvoDollarsPerBbl } from "@/lib/marks/convert";
import { plantMoney, type MoneyLine, type TankMoney } from "@/lib/marks/money";
import { usePlant } from "./plant-context";

export function MoneyScreen() {
  const { plant, solve, solverStatus } = usePlant();
  const money = plantMoney(plant, solve);
  const waiting = solverStatus === "idle";
  const infeasible = solverStatus === "infeasible";
  const impliedPending =
    solverStatus === "optimal" &&
    money.lines.some((line) => line.impliedPerBbl === null) &&
    Object.keys(solve.impliedValues).length === 0;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>Why you lift or don&apos;t</CardTitle>
        <CardDescription>
          After Solve: book versus the same LP implied the naphtha seek uses. DON&apos;T LIFT if
          implied is more than ${formatNumber(plant.liftEpsilonPerBbl, 2)}/bbl below book, or if the
          only price is a toy default assay. Debit-card math elsewhere is a heuristic, not the bid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {waiting ? (
          <p className="text-sm text-muted-foreground">Press Solve plant to price the lift.</p>
        ) : null}
        {infeasible ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p>No recipe. The plant is infeasible — not a zero blend.</p>
            <p className="mt-1">Binding: {money.bindingLine}</p>
            {solve.cheapestRelax ? <p className="mt-1">Cheapest relax: {solve.cheapestRelax.label}.</p> : null}
          </div>
        ) : null}

        <MarksUsed
          date={money.marksDate}
          rackLabel="GC CBOB"
          rackPerBbl={money.rackPerBbl}
          rackStale={money.rackStale}
          ethanolPerBbl={money.ethanolPerBbl}
          ethanolStale={money.ethanolStale}
          d6Cts={money.d6Cts}
          d6PerRin={money.d6PerRin}
          d6Stale={money.d6Stale}
          obligationRate={plant.rvo.obligationRate}
        />

        <MoneyTotals
          title="Plant"
          finishedBbl={money.finishedBbl}
          blendCost={money.blendCost}
          revenue={money.revenue}
          rvoNet={money.rvoNet}
          freight={money.freight}
          margin={money.margin}
          blendCostPerBbl={money.blendCostPerBbl}
          revenuePerBbl={money.revenuePerBbl}
          rvoNetPerBbl={money.rvoNetPerBbl}
          freightPerBbl={money.freightPerBbl}
          marginPerBbl={money.marginPerBbl}
        />
        <p className="text-xs text-muted-foreground">Binding: {money.bindingLine}</p>
        {impliedPending ? (
          <p className="text-xs text-muted-foreground">Computing LP implieds — same dual as naphtha seek.</p>
        ) : null}
        {!infeasible && !waiting ? <LiftTable lines={money.lines} /> : null}

        {money.tanks.map((tank) => (
          <TankMoneyBlock key={tank.tankId} tank={tank} obligationRate={plant.rvo.obligationRate} hideIfIdle={waiting} />
        ))}
      </CardContent>
    </Card>
  );
}

function TankMoneyBlock({
  tank,
  obligationRate,
  hideIfIdle,
}: {
  tank: TankMoney;
  obligationRate: number;
  hideIfIdle: boolean;
}) {
  if (hideIfIdle) return null;
  return (
    <section className="space-y-2 rounded-xl border border-border/80 p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{tank.name}</h3>
          <p className="text-[11px] text-muted-foreground">
            Marks {tank.marksDate ?? "missing"} · {tank.rackLabel}
            {tank.rackStale ? " · stale / missing" : ""}
          </p>
        </div>
      </div>
      <MarksUsed
        date={tank.marksDate}
        rackLabel={tank.rackLabel}
        rackPerBbl={tank.rackPerBbl}
        rackStale={tank.rackStale}
        ethanolPerBbl={tank.ethanolPerBbl}
        ethanolStale={tank.ethanolStale}
        d6Cts={tank.d6Cts}
        d6PerRin={tank.d6PerRin}
        d6Stale={tank.d6Stale}
        obligationRate={obligationRate}
      />
      <MoneyTotals
        title={tank.name}
        finishedBbl={tank.finishedBbl}
        blendCost={tank.blendCost}
        revenue={tank.revenue}
        rvoNet={tank.rvoNet}
        freight={tank.freight}
        margin={tank.margin}
        blendCostPerBbl={tank.blendCostPerBbl}
        revenuePerBbl={tank.revenuePerBbl}
        rvoNetPerBbl={tank.rvoNetPerBbl}
        freightPerBbl={tank.freightPerBbl}
        marginPerBbl={tank.marginPerBbl}
      />
      <p className="text-xs text-muted-foreground">Binding: {tank.bindingLine}</p>
      <LiftTable lines={tank.lines} />
    </section>
  );
}

function MarksUsed({
  date,
  rackLabel,
  rackPerBbl,
  rackStale,
  ethanolPerBbl,
  ethanolStale,
  d6Cts,
  d6PerRin,
  d6Stale,
  obligationRate,
}: {
  date: string | null;
  rackLabel: string;
  rackPerBbl: number | null;
  rackStale: boolean;
  ethanolPerBbl: number | null;
  ethanolStale: boolean;
  d6Cts: number | null;
  d6PerRin: number;
  d6Stale: boolean;
  obligationRate: number;
}) {
  return (
    <p className="text-xs text-muted-foreground">
      Marks {date ?? "missing"} · {rackLabel}{" "}
      {rackPerBbl === null ? "—" : formatMoney(rackPerBbl, 3) + "/bbl"}
      {rackStale ? " (stale / missing)" : ""}
      {" · "}ethanol {ethanolPerBbl === null ? "—" : formatMoney(ethanolPerBbl, 3) + "/bbl"}
      {ethanolStale ? " (stale / missing)" : ""}
      {" · "}D6 {d6Cts === null ? "—" : `${formatNumber(d6Cts, 2)} cts/RIN`} → {formatMoney(d6PerRin, 4)}/RIN
      {" → "}
      RVO {formatMoney(rvoDollarsPerBbl(d6PerRin, obligationRate), 3)}/bbl
      {d6Stale ? " (stale / missing)" : ""}
    </p>
  );
}

function MoneyTotals({
  title,
  finishedBbl,
  blendCost,
  revenue,
  rvoNet,
  freight,
  margin,
  blendCostPerBbl,
  revenuePerBbl,
  rvoNetPerBbl,
  freightPerBbl,
  marginPerBbl,
}: {
  title: string;
  finishedBbl: number;
  blendCost: number | null;
  revenue: number | null;
  rvoNet: number | null;
  freight: number | null;
  margin: number | null;
  blendCostPerBbl: number | null;
  revenuePerBbl: number | null;
  rvoNetPerBbl: number | null;
  freightPerBbl: number | null;
  marginPerBbl: number | null;
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <Metric label={`${title} blend cost`} total={blendCost} perBbl={blendCostPerBbl} finishedBbl={finishedBbl} />
      <Metric label="Revenue" total={revenue} perBbl={revenuePerBbl} finishedBbl={finishedBbl} />
      <Metric label="RVO net" total={rvoNet} perBbl={rvoNetPerBbl} finishedBbl={finishedBbl} />
      <Metric label="Freight" total={freight} perBbl={freightPerBbl} finishedBbl={finishedBbl} />
      <Metric
        label="Margin"
        total={margin}
        perBbl={marginPerBbl}
        finishedBbl={finishedBbl}
        tone={margin === null ? "muted" : margin >= 0 ? "good" : "bad"}
      />
    </dl>
  );
}

function Metric({
  label,
  total,
  perBbl,
  finishedBbl,
  tone = "muted",
}: {
  label: string;
  total: number | null;
  perBbl: number | null;
  finishedBbl: number;
  tone?: "muted" | "good" | "bad";
}) {
  const toneClass = tone === "good" ? "text-emerald-800" : tone === "bad" ? "text-red-700" : "text-muted-foreground";
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-base tabular-nums">{formatMoney(total, 0)}</dd>
      <p className={`text-[11px] ${toneClass}`}>
        {perBbl === null ? "—" : `${formatMoney(perBbl, 3)}/bbl`}
        {finishedBbl > 0 && perBbl !== null ? ` · ${formatPerGal(perGalFromBbl(perBbl))}` : ""}
      </p>
    </div>
  );
}

function LiftTable({ lines }: { lines: MoneyLine[] }) {
  if (lines.length === 0) {
    return <p className="text-xs text-muted-foreground">No components taken.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-xs">
        <thead>
          <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
            <th className="py-1 pr-2 font-medium">Component</th>
            <th className="py-1 pr-2 text-right font-medium">bbl</th>
            <th className="py-1 pr-2 text-right font-medium">Book $/bbl</th>
            <th className="py-1 pr-2 text-right font-medium">Implied $/bbl</th>
            <th className="py-1 pr-2 text-right font-medium">Book − implied</th>
            <th className="py-1 font-medium">Call</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-border/70">
              <td className="py-1.5 pr-2">
                <p className="font-medium">{line.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {line.streamKey}
                  {line.priceStale ? " · stale / missing" : ""}
                  {line.priceOrigin === "defaults" ? " · toy default" : ""}
                </p>
              </td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatNumber(line.barrels, 0)}</td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatMoney(line.bookPerBbl, 3)}</td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                {line.impliedPerBbl === null ? "…" : formatMoney(line.impliedPerBbl, 3)}
              </td>
              <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                {line.bookMinusImplied === null ? "—" : formatMoney(line.bookMinusImplied, 3)}
              </td>
              <td className="py-1.5">
                {line.call === "LIFT" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-800">LIFT</Badge>
                ) : (
                  <Badge variant="destructive">DON&apos;T LIFT</Badge>
                )}
                <p className="mt-0.5 max-w-[14rem] text-[10px] text-muted-foreground">{line.reason}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
