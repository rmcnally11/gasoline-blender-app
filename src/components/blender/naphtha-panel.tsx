"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { NaphthaKind, NaphthaSeekResult } from "@/lib/blend";
import { formatBbl, formatMoney, formatNumber } from "@/lib/blend";
import { ActionButton } from "./action-button";
import { NumberField } from "./number-field";

export function NaphthaPanel({
  lightPrice,
  heavyPrice,
  lightResult,
  heavyResult,
  busy = false,
  onPriceChange,
  onSeek,
}: {
  lightPrice: number;
  heavyPrice: number;
  lightResult: NaphthaSeekResult | null;
  heavyResult: NaphthaSeekResult | null;
  busy?: boolean;
  onPriceChange: (kind: Exclude<NaphthaKind, null>, price: number) => void;
  onSeek: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Naphtha goal-seek</CardTitle>
            <CardDescription>
              At what purchase price does light or heavy naphtha still make an on-spec
              domestic barrel after sulfur, benzene, distillation, and RVO?
            </CardDescription>
          </div>
          <ActionButton onClick={onSeek} busy={busy}>
            {busy ? "Seeking…" : "Goal-seek values"}
          </ActionButton>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <SeekColumn
          title="Light naphtha"
          kind="light"
          price={lightPrice}
          result={lightResult}
          onPriceChange={onPriceChange}
        />
        <SeekColumn
          title="Heavy naphtha"
          kind="heavy"
          price={heavyPrice}
          result={heavyResult}
          onPriceChange={onPriceChange}
        />
      </CardContent>
    </Card>
  );
}

function SeekColumn({
  title,
  kind,
  price,
  result,
  onPriceChange,
}: {
  title: string;
  kind: Exclude<NaphthaKind, null>;
  price: number;
  result: NaphthaSeekResult | null;
  onPriceChange: (kind: Exclude<NaphthaKind, null>, price: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">Offered cargo / tank price</p>
        </div>
        {result ? (
          result.clears ? (
            <Badge className="bg-emerald-500/15 text-emerald-800">Creates a barrel</Badge>
          ) : (
            <Badge variant="destructive">Does not clear</Badge>
          )
        ) : (
          <Badge variant="outline">Run seek</Badge>
        )}
      </div>
      <label className="block space-y-1">
        <Label className="text-xs text-muted-foreground">Offer, $/bbl</Label>
        <NumberField value={price} digits={2} step={0.5} onChange={(value) => onPriceChange(kind, value)} />
      </label>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">Implied value</dt>
          <dd className="font-mono text-lg tabular-nums">{formatMoney(result?.impliedValue)}</dd>
        </div>
        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">Taken now</dt>
          <dd className="font-mono text-lg tabular-nums">{formatBbl(result?.usedBbl ?? 0)}</dd>
        </div>
      </dl>
      <p className="text-xs leading-5 text-muted-foreground">{result?.message ?? "Solve the header, then goal-seek."}</p>
      {result?.debits.length ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-1 font-medium">Debit</th>
              <th className="pb-1 text-right font-medium">$/bbl</th>
            </tr>
          </thead>
          <tbody>
            {result.debits.map((debit) => (
              <tr key={debit.id} className="border-t border-border/60">
                <td className="py-1.5 pr-2">
                  <div className="font-medium text-foreground">{debit.label}</div>
                  <div className="text-[11px] text-muted-foreground">{debit.note}</div>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatNumber(debit.amount, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
