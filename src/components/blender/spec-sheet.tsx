"use client";

import { Badge } from "@/components/ui/badge";
import type { ProductSpecs, SpecCheck } from "@/lib/blend";
import { formatNumber, formatSigned } from "@/lib/blend";
import { NumberField } from "./number-field";

const EDITABLE: Partial<Record<string, { key: keyof ProductSpecs; step: number; digits: number }>> = {
  aki: { key: "akiMin", step: 0.1, digits: 1 },
  ron: { key: "ronMin", step: 0.1, digits: 1 },
  mon: { key: "monMin", step: 0.1, digits: 1 },
  rvp: { key: "rvpMaxPsi", step: 0.1, digits: 1 },
  sulfur: { key: "sulfurMaxPpm", step: 0.5, digits: 1 },
  benzene: { key: "benzeneMaxVolPct", step: 0.01, digits: 2 },
  aromatics: { key: "aromaticsMaxVolPct", step: 0.1, digits: 1 },
  olefins: { key: "olefinsMaxVolPct", step: 0.1, digits: 1 },
  oxygen: { key: "oxygenMaxWtPct", step: 0.1, digits: 2 },
  oxygenMin: { key: "oxygenMinWtPct", step: 0.1, digits: 2 },
  t10: { key: "t10MaxF", step: 1, digits: 0 },
  t50min: { key: "t50MinF", step: 1, digits: 0 },
  t50: { key: "t50MaxF", step: 1, digits: 0 },
  t90: { key: "t90MaxF", step: 1, digits: 0 },
  di: { key: "diMax", step: 5, digits: 0 },
};

function limitText(limit: number | null, digits: number): string {
  return limit === null ? "—" : formatNumber(limit, digits);
}

export function SpecSheet({
  checks,
  specs,
  onSpecChange,
  rvpNote,
  overlayOn,
  compact = false,
}: {
  checks: SpecCheck[];
  specs: ProductSpecs;
  onSpecChange: (patch: Partial<ProductSpecs>) => void;
  rvpNote: string;
  overlayOn: boolean;
  compact?: boolean;
}) {
  const shown = compact
    ? checks.filter((check) =>
        ["aki", "rvp", "sulfur", "benzene", "t50", "t90", "di", "oxygen", "oxygenMin", "aromatics", "olefins"].includes(check.id),
      )
    : checks;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Property</th>
            <th className="pb-2 text-right font-medium">Blend</th>
            <th className="pb-2 text-right font-medium">Pipe receipt</th>
            <th className="pb-2 text-right font-medium">Finished</th>
            <th className="pb-2 text-right font-medium">LP</th>
            <th className="pb-2 text-right font-medium">Slack</th>
            <th className="pb-2 pl-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((check) => {
            const editable = EDITABLE[check.id];
            const limitValue = editable ? specs[editable.key] : check.limit;
            const digits = editable?.digits ?? 2;
            return (
              <tr key={check.id} className="border-t border-border/70">
                <td className="py-1.5 pr-3">
                  <div className="font-medium">{check.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {check.id === "rvp" ? rvpNote : check.blendRule}
                  </div>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {check.status === "idle" ? "—" : formatNumber(check.value, check.unit === "°F" || check.unit === "DI" ? 0 : 2)}
                  <span className="ml-1 text-[11px] text-muted-foreground">{check.unit}</span>
                </td>
                <td className="py-1.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {limitText(check.pipeLimit, digits)}
                </td>
                <td className="py-1.5 text-right font-mono text-xs tabular-nums">
                  <span className={overlayOn && (check.id === "sulfur" || check.id === "benzene") ? "text-amber-800" : "text-muted-foreground"}>
                    {limitText(check.finishedLimit, digits)}
                  </span>
                </td>
                <td className="py-1.5 pl-3">
                  {editable && limitValue !== null ? (
                    <NumberField
                      aria-label={`${check.label} LP limit`}
                      className="ml-auto w-20"
                      value={Number(limitValue)}
                      digits={editable.digits}
                      step={editable.step}
                      onChange={(value) => onSpecChange({ [editable.key]: value })}
                    />
                  ) : (
                    <div className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {check.limit === null ? "off" : formatNumber(check.limit, 2)}
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatSigned(check.slack, 2)}</td>
                <td className="py-1.5 pl-3">
                  <SpecBadge check={check} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="pt-2 text-[11px] text-muted-foreground">
        Pipe receipt is the Colonial / Explorer / SFPP / Mexico tariff. Finished is the rack.
        Overlay 10 ppm S / 0.62% benzene writes the finished column only. LP is the number the
        solver is using.
      </p>
    </div>
  );
}

function SpecBadge({ check }: { check: SpecCheck }) {
  if (check.status === "idle") return <Badge variant="outline">Waiting</Badge>;
  if (check.status === "fail") return <Badge variant="destructive">Off spec</Badge>;
  if (check.status === "batch") return <Badge variant="outline">Clean batch</Badge>;
  if (check.binding) return <Badge className="bg-amber-500/15 text-amber-800">Binding</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-800">On spec</Badge>;
}
