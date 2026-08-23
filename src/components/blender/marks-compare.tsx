"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatNumber } from "@/lib/blend";
import { compareSettlementDays } from "@/lib/marks/compare";
import { useMemo } from "react";
import { usePlant } from "./plant-context";

function moneyOrDash(value: number | null | undefined, digits = 3, suffix = "/bbl"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${formatMoney(value, digits)}${suffix}`;
}

function signedMoney(value: number | null, digits = 0, suffix = ""): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMoney(value, digits)}${suffix}`;
}

export function MarksCompare() {
  const { plant, solve, solverStatus } = usePlant();
  const compare = useMemo(
    () =>
      compareSettlementDays({
        plant,
        priorMarks: plant.priorMarks,
        solve,
        todayImplied: solve.impliedValues,
        priorImplied: solverStatus === "optimal" ? undefined : {},
      }),
    [plant, solve, solverStatus],
  );

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>Last settlement vs prior</CardTitle>
        <CardDescription>
          Same solved barrels into P1 / P2 / P3. Two Platts Daily Date rows — no second plant, no
          Sunday print if the table has none.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {solverStatus === "idle" ? (
          <p className="text-sm text-muted-foreground">
            Press Solve plant. The compare freezes that recipe and reprices it on both mark sets.
          </p>
        ) : null}
        {solverStatus === "infeasible" ? (
          <p className="text-sm text-red-800">No recipe to freeze — plant is infeasible.</p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Last settlement {compare.todayDate ?? "missing"}
          {compare.priorMissing
            ? " · no prior settlement row"
            : ` vs prior settlement ${compare.priorDate ?? "missing"}`}
        </p>

        {compare.bookStale ? (
          <p className="text-xs text-rose-700">
            Component book stale — alk / FCC / reformate did not take a typical spread. Rack,
            ethanol, and D6 can still move.
          </p>
        ) : null}
        {plant.bookLoadError ? (
          <p className="text-xs text-rose-700">{plant.bookLoadError}</p>
        ) : null}

        <dl className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <CompareMark
            label="GC CBOB rack"
            today={moneyOrDash(compare.today.rackPerBbl)}
            prior={compare.prior ? moneyOrDash(compare.prior.rackPerBbl) : "—"}
          />
          <CompareMark
            label="Ethanol"
            today={moneyOrDash(compare.today.ethanolPerBbl)}
            prior={compare.prior ? moneyOrDash(compare.prior.ethanolPerBbl) : "—"}
          />
          <CompareMark
            label="D6"
            today={compare.today.d6Cts === null ? "—" : `${formatNumber(compare.today.d6Cts, 2)} cts/RIN`}
            prior={
              !compare.prior || compare.prior.d6Cts === null
                ? "—"
                : `${formatNumber(compare.prior.d6Cts, 2)} cts/RIN`
            }
          />
          <CompareMark
            label="Plant margin"
            today={`${formatMoney(compare.today.margin, 0)} · ${moneyOrDash(compare.today.marginPerBbl)}`}
            prior={
              compare.prior
                ? `${formatMoney(compare.prior.margin, 0)} · ${moneyOrDash(compare.prior.marginPerBbl)}`
                : "—"
            }
            extra={`Δ ${signedMoney(compare.deltaMargin, 0)} · ${signedMoney(compare.deltaMarginPerBbl, 3, "/bbl")}`}
          />
        </dl>

        <p className="text-sm font-medium">{compare.stripLine}</p>

        {solverStatus === "optimal" && compare.streams.length > 0 ? (
          <LiftCompareTable streams={compare.streams} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CompareMark({
  label,
  today,
  prior,
  extra,
}: {
  label: string;
  today: string;
  prior: string;
  extra?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{today}</dd>
      <p className="text-[11px] text-muted-foreground">prior {prior}</p>
      {extra ? <p className="text-[11px] text-muted-foreground">{extra}</p> : null}
    </div>
  );
}

function LiftCompareTable({ streams }: { streams: ReturnType<typeof compareSettlementDays>["streams"] }) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {streams.map((stream) => (
          <article key={stream.id} className="space-y-2 rounded-xl border border-border/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{stream.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {stream.streamKey} · {formatNumber(stream.barrels, 0)} bbl
                  {stream.today.priceStale ? " · stale" : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <CallBadge call={stream.today.call} />
                <p className="text-[10px] text-muted-foreground">prior {stream.prior.call}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <Pair label="Book $/bbl" today={stream.today.bookPerBbl} prior={stream.prior.bookPerBbl} />
              <Pair label="Implied $/bbl" today={stream.today.impliedPerBbl} prior={stream.prior.impliedPerBbl} />
              <Pair
                label="Book − implied"
                today={stream.today.bookMinusImplied}
                prior={stream.prior.bookMinusImplied}
              />
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[40rem] text-left text-xs">
          <thead>
            <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
              <th className="py-1 pr-2 font-medium">Lifted</th>
              <th className="py-1 pr-2 text-right font-medium">bbl</th>
              <th className="py-1 pr-2 text-right font-medium">Book last</th>
              <th className="py-1 pr-2 text-right font-medium">Book prior</th>
              <th className="py-1 pr-2 text-right font-medium">Implied last</th>
              <th className="py-1 pr-2 text-right font-medium">Implied prior</th>
              <th className="py-1 pr-2 text-right font-medium">Bk−imp last</th>
              <th className="py-1 pr-2 text-right font-medium">Bk−imp prior</th>
              <th className="py-1 font-medium">Call</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => (
              <tr key={stream.id} className="border-t border-border/70">
                <td className="py-1.5 pr-2">
                  <p className="font-medium">{stream.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {stream.streamKey}
                    {stream.today.priceStale ? " · stale" : ""}
                  </p>
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatNumber(stream.barrels, 0)}</td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {formatMoney(stream.today.bookPerBbl, 3)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {formatMoney(stream.prior.bookPerBbl, 3)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {stream.today.impliedPerBbl === null ? "…" : formatMoney(stream.today.impliedPerBbl, 3)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {stream.prior.impliedPerBbl === null ? "…" : formatMoney(stream.prior.impliedPerBbl, 3)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {stream.today.bookMinusImplied === null ? "—" : formatMoney(stream.today.bookMinusImplied, 3)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {stream.prior.bookMinusImplied === null ? "—" : formatMoney(stream.prior.bookMinusImplied, 3)}
                </td>
                <td className="py-1.5">
                  <CallBadge call={stream.today.call} />
                  <p className="mt-0.5 text-[10px] text-muted-foreground">prior {stream.prior.call}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pair({
  label,
  today,
  prior,
}: {
  label: string;
  today: number | null;
  prior: number | null;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-1.5">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono tabular-nums">{today === null ? "…" : formatMoney(today, 3)}</dd>
      <p className="text-[10px] text-muted-foreground">
        prior {prior === null ? "—" : formatMoney(prior, 3)}
      </p>
    </div>
  );
}

function CallBadge({ call }: { call: "LIFT" | "DON'T LIFT" }) {
  return call === "LIFT" ? (
    <Badge className="bg-teal-500/15 text-teal-800">LIFT</Badge>
  ) : (
    <Badge variant="destructive">DON&apos;T LIFT</Badge>
  );
}
