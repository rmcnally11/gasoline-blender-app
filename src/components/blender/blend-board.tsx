"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { blendBoard, type BlendBoardStream } from "@/lib/blend/blend-board";
import { formatMoney, formatNumber, formatPct, formatSigned } from "@/lib/blend";
import { RecipeBar } from "./recipe-bar";
import { TermTip } from "./term-tip";
import { usePlant } from "./plant-context";

export function BlendBoard() {
  const { plant, solve, solverStatus } = usePlant();
  const board = blendBoard(plant, solve);
  const waiting = solverStatus === "idle";
  const infeasible = solverStatus === "infeasible";

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>The blend</CardTitle>
        <CardDescription>
          Same frozen barrels as P&amp;L. What went into P1 / P2 / P3, how close to the money specs,
          and where the dollars went. Not a second optimize.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {waiting ? <p className="text-sm text-muted-foreground">{board.message}</p> : null}
        {infeasible ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {board.message}
          </div>
        ) : null}

        {board.ready ? (
          <>
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Plant recipe</h3>
              <RecipeBar
                components={plant.components}
                recipe={{ volumes: board.recipeVolumes }}
              />
              <p className="text-xs text-muted-foreground">Binding: {board.message}</p>
            </section>

            <RecipeTable streams={board.streams} leftover={board.leftover} />

            {board.dollars ? <DollarStack dollars={board.dollars} /> : null}

            <QualityTable rows={board.quality} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RecipeTable({
  streams,
  leftover,
}: {
  streams: BlendBoardStream[];
  leftover: BlendBoardStream[];
}) {
  const rows = [...streams, ...leftover];
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No components taken.</p>;
  }
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Barrels into the tanks</h3>
      <p className="text-xs text-muted-foreground">
        Used first. Rows at 0 bbl are on and have inventory — Solve left them in the tank.
      </p>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <StreamCard key={row.id} row={row} unused={row.barrels <= 1e-6} />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[44rem] text-left text-xs">
          <thead>
            <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
              <th className="py-1 pr-2 font-medium">
                <TermTip term="stream">Stream</TermTip>
              </th>
              <th className="py-1 pr-2 text-right font-medium">P1</th>
              <th className="py-1 pr-2 text-right font-medium">P2</th>
              <th className="py-1 pr-2 text-right font-medium">P3</th>
              <th className="py-1 pr-2 text-right font-medium">Total</th>
              <th className="py-1 pr-2 text-right font-medium">vol%</th>
              <th className="py-1 pr-2 text-right font-medium">
                <TermTip term="inventory">Left</TermTip>
              </th>
              <th className="py-1 pr-2 font-medium">Draw</th>
              <th className="py-1 pr-2 text-right font-medium">
                <TermTip term="book">Book</TermTip>
              </th>
              <th className="py-1 pr-2 text-right font-medium">
                <TermTip term="implied">Implied</TermTip>
              </th>
              <th className="py-1 font-medium">
                <TermTip term="lift">Call</TermTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const unused = row.barrels <= 1e-6;
              return (
                <tr
                  key={row.id}
                  className={`border-t border-border/70 ${unused ? "text-muted-foreground" : ""}`}
                >
                  <td className="py-1.5 pr-2">
                    <p className={`flex items-center gap-1.5 ${unused ? "" : "font-medium text-foreground"}`}>
                      <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.streamKey}
                      {row.priceStale ? " · stale" : ""}
                      {unused ? " · 0 in the recipe" : ""}
                    </p>
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatNumber(row.into.P1, 0)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatNumber(row.into.P2, 0)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatNumber(row.into.P3, 0)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatNumber(row.barrels, 0)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                    {unused ? "—" : formatPct(row.volPct)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatNumber(row.leftBbl, 0)}</td>
                  <td className="py-1.5 pr-2">
                    <InventoryBar used={row.barrels} inventory={row.inventoryBbl} />
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatMoney(row.bookPerBbl, 3)}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                    {unused ? "—" : row.impliedPerBbl === null ? "…" : formatMoney(row.impliedPerBbl, 3)}
                  </td>
                  <td className="py-1.5">
                    <CallBadge row={row} unused={unused} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QualityTable({ rows }: { rows: ReturnType<typeof blendBoard>["quality"] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">
        Money-spec <TermTip term="slack">slack</TermTip>
      </h3>
      <p className="text-xs text-muted-foreground">
        AKI, RVP, sulfur, benzene on the mixed tank. Slack is room to the limit the LP is using.
      </p>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <article key={`${row.tankId}-${row.specId}`} className="rounded-xl border border-border/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {row.tankName} {row.label}
              </p>
              <QualityBadge row={row} />
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <Cell label="Blend" value={row.value === null ? "—" : `${formatNumber(row.value, 2)} ${row.unit}`} />
              <Cell label="Limit" value={row.limit === null ? "—" : `${formatNumber(row.limit, 2)}`} />
              <Cell label="Slack" value={row.slack === null ? "—" : formatSigned(row.slack, 2)} />
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead>
            <tr className="text-[10px] tracking-wide text-muted-foreground uppercase">
              <th className="py-1 pr-2 font-medium">Tank</th>
              <th className="py-1 pr-2 font-medium">Spec</th>
              <th className="py-1 pr-2 text-right font-medium">Blend</th>
              <th className="py-1 pr-2 text-right font-medium">Limit</th>
              <th className="py-1 pr-2 text-right font-medium">Slack</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.tankId}-${row.specId}`} className="border-t border-border/70">
                <td className="py-1.5 pr-2 font-medium">{row.tankName}</td>
                <td className="py-1.5 pr-2">
                  {row.label} <span className="text-muted-foreground">{row.unit}</span>
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {row.value === null ? "—" : formatNumber(row.value, 2)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {row.limit === null ? "—" : formatNumber(row.limit, 2)}
                </td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                  {row.slack === null ? "—" : formatSigned(row.slack, 2)}
                </td>
                <td className="py-1.5">
                  <QualityBadge row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DollarStack({
  dollars,
}: {
  dollars: NonNullable<ReturnType<typeof blendBoard>["dollars"]>;
}) {
  const scale = Math.max(dollars.revenue, dollars.blendCost + dollars.rvoNet + dollars.freight, 1);
  const rows = [
    { id: "rev", label: "Revenue", value: dollars.revenue, tone: "in" as const },
    { id: "blend", label: "Blend cost", value: dollars.blendCost, tone: "out" as const },
    { id: "rvo", label: "RVO net", value: dollars.rvoNet, tone: "out" as const },
    { id: "freight", label: "Freight", value: dollars.freight, tone: "out" as const },
    { id: "margin", label: "Margin", value: dollars.margin, tone: "net" as const },
  ];
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Dollar stack</h3>
      <p className="text-xs text-muted-foreground">
        Marker minus book minus RVO minus freight on {formatNumber(dollars.finishedBbl, 0)} finished
        barrels. Same math as P&amp;L.
      </p>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)_7rem] items-center gap-2 text-xs">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="h-3 overflow-hidden rounded bg-muted/60">
              <div
                className={
                  row.tone === "in"
                    ? "h-full bg-sky-700/70"
                    : row.tone === "net"
                      ? dollars.margin >= 0
                        ? "h-full bg-teal-700/70"
                        : "h-full bg-red-700/70"
                      : "h-full bg-foreground/25"
                }
                style={{ width: `${Math.min(100, (Math.abs(row.value) / scale) * 100)}%` }}
              />
            </dd>
            <p
              className={`text-right font-mono tabular-nums ${
                row.tone === "net" ? (dollars.margin >= 0 ? "text-teal-800" : "text-red-700") : ""
              }`}
            >
              {formatMoney(row.value, 0)}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StreamCard({ row, unused }: { row: BlendBoardStream; unused: boolean }) {
  return (
    <article className={`space-y-2 rounded-xl border border-border/80 p-3 ${unused ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{row.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {row.streamKey}
            {unused ? " · 0 in the recipe" : ` · ${formatPct(row.volPct)} of new barrels`}
            {row.priceStale ? " · stale" : ""}
          </p>
        </div>
        <CallBadge row={row} unused={unused} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <Cell label="P1" value={formatNumber(row.into.P1, 0)} />
        <Cell label="P2" value={formatNumber(row.into.P2, 0)} />
        <Cell label="P3" value={formatNumber(row.into.P3, 0)} />
        <Cell label="Total" value={formatNumber(row.barrels, 0)} />
        <Cell label="Left" value={formatNumber(row.leftBbl, 0)} />
        <Cell label="Book" value={formatMoney(row.bookPerBbl, 2)} />
      </dl>
      <InventoryBar used={row.barrels} inventory={row.inventoryBbl} />
    </article>
  );
}

function CallBadge({ row, unused }: { row: BlendBoardStream; unused: boolean }) {
  if (unused) {
    return (
      <TermTip term="leftover">
        <Badge variant="outline">Not used</Badge>
      </TermTip>
    );
  }
  if (row.call === "LIFT") return <Badge className="bg-teal-500/15 text-teal-800">LIFT</Badge>;
  if (row.call === "DON'T LIFT") return <Badge variant="destructive">DON&apos;T LIFT</Badge>;
  return <span className="text-muted-foreground">—</span>;
}

function InventoryBar({ used, inventory }: { used: number; inventory: number }) {
  const pct = inventory > 0 ? Math.min(100, (used / inventory) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded bg-muted/60" title={`${formatNumber(used, 0)} of ${formatNumber(inventory, 0)}`}>
      <div className="h-full bg-sky-800/70" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-1.5">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}

function QualityBadge({ row }: { row: ReturnType<typeof blendBoard>["quality"][number] }) {
  if (row.status === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (row.binding) return <Badge className="bg-rose-500/15 text-rose-800">Binding</Badge>;
  if (row.status === "idle" || row.status === "batch") return <Badge variant="outline">—</Badge>;
  return <Badge className="bg-teal-500/15 text-teal-800">OK</Badge>;
}
