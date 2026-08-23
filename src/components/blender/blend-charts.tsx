"use client";

import { formatMoney, formatNumber } from "@/lib/blend";
import type { BlendBoard, BlendBoardStream } from "@/lib/blend/blend-board";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SKY = "#0369a1";
const TEAL = "#0f766e";
const SLATE = "#64748b";
const CORAL = "#be123c";

export function BlendCharts({ board }: { board: BlendBoard }) {
  if (!board.ready || board.streams.length === 0) return null;

  const mix = board.streams.map((row) => ({
    id: row.id,
    name: row.shortName,
    barrels: Math.round(row.barrels),
    fill: row.color,
  }));

  const tanks = ["P1", "P2", "P3"] as const;
  const stacked = tanks.map((tank) => {
    const point: Record<string, string | number> = { tank };
    for (const row of board.streams) {
      point[row.id] = Math.round(row.into[tank]);
    }
    return point;
  });

  const bids = board.streams
    .filter((row) => row.impliedPerBbl !== null)
    .map((row) => ({
      name: row.shortName,
      book: Number(row.bookPerBbl.toFixed(2)),
      implied: Number((row.impliedPerBbl ?? 0).toFixed(2)),
    }));

  const dollars = board.dollars
    ? [
        { name: "Revenue", value: Math.round(board.dollars.revenue), fill: SKY },
        { name: "Blend", value: Math.round(board.dollars.blendCost), fill: SLATE },
        { name: "RVO", value: Math.round(board.dollars.rvoNet), fill: SLATE },
        { name: "Freight", value: Math.round(board.dollars.freight), fill: SLATE },
        {
          name: "Margin",
          value: Math.round(board.dollars.margin),
          fill: board.dollars.margin >= 0 ? TEAL : CORAL,
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Plant mix" hint="New barrels, all tanks. Same recipe as Solve.">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={mix}
                dataKey="barrels"
                nameKey="name"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={1}
              >
                {mix.map((row) => (
                  <Cell key={row.id} fill={row.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${formatNumber(Number(value), 0)} bbl`, ""]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Into P1 / P2 / P3" hint="Stacked barrels by stream. Heel is already in the tank — this is new components.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stacked} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="tank" />
              <YAxis tickFormatter={(value) => formatNumber(Number(value), 0)} />
              <Tooltip
                formatter={(value, name) => [
                  `${formatNumber(Number(value), 0)} bbl`,
                  streamName(board.streams, String(name)),
                ]}
              />
              <Legend formatter={(value) => streamName(board.streams, String(value))} />
              {board.streams.map((row) => (
                <Bar key={row.id} dataKey={row.id} stackId="lift" fill={row.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {bids.length > 0 ? (
        <ChartCard title="Book vs implied" hint="$/bbl on streams that made the lift. Implied is the bid.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bids} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={48} />
              <YAxis tickFormatter={(value) => formatMoney(Number(value), 0)} />
              <Tooltip formatter={(value, name) => [formatMoney(Number(value), 2) + "/bbl", String(name)]} />
              <Legend />
              <Bar dataKey="book" name="Book" fill={SLATE} />
              <Bar dataKey="implied" name="Implied" fill={SKY} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {dollars.length > 0 ? (
        <ChartCard title="Dollar stack" hint="Same P&L: revenue, blend, RVO, freight, margin.">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dollars} layout="vertical" margin={{ top: 8, right: 16, left: 64, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatMoney(Number(value), 0)} />
              <YAxis type="category" dataKey="name" width={64} />
              <Tooltip formatter={(value) => [formatMoney(Number(value), 0), ""]} />
              <Bar dataKey="value" name="$">
                {dollars.map((row) => (
                  <Cell key={row.name} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </div>
  );
}

function streamName(streams: BlendBoardStream[], id: string): string {
  return streams.find((row) => row.id === id)?.shortName ?? id;
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-border/80 p-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  );
}
