"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { regionLabel, type Blendstock } from "@/lib/blend";
import { NumberField } from "./number-field";

const FIELDS: { key: keyof Blendstock; label: string; step: number; digits: number }[] = [
  { key: "ron", label: "Blending RON", step: 0.1, digits: 1 },
  { key: "mon", label: "Blending MON", step: 0.1, digits: 1 },
  { key: "rvp", label: "RVP, psi", step: 0.1, digits: 1 },
  { key: "specificGravity", label: "Specific gravity", step: 0.001, digits: 3 },
  { key: "sulfurPpm", label: "Sulfur, ppm", step: 0.5, digits: 1 },
  { key: "benzeneVolPct", label: "Benzene, vol%", step: 0.01, digits: 2 },
  { key: "aromaticsVolPct", label: "Aromatics, vol%", step: 0.1, digits: 1 },
  { key: "olefinsVolPct", label: "Olefins, vol%", step: 0.1, digits: 1 },
  { key: "oxygenWtPct", label: "Oxygen, wt%", step: 0.1, digits: 2 },
  { key: "t10F", label: "T10, °F", step: 1, digits: 0 },
  { key: "t50F", label: "T50, °F", step: 1, digits: 0 },
  { key: "t90F", label: "T90, °F", step: 1, digits: 0 },
  { key: "e200VolPct", label: "E200, vol%", step: 0.5, digits: 1 },
  { key: "e300VolPct", label: "E300, vol%", step: 0.5, digits: 1 },
  { key: "costPerBbl", label: "Market, $/bbl", step: 0.5, digits: 2 },
  { key: "inventoryBbl", label: "Inventory, bbl", step: 10, digits: 0 },
  { key: "maxLiftBbl", label: "Max lift, bbl", step: 10, digits: 0 },
  { key: "minLiftBbl", label: "Min lift, bbl", step: 10, digits: 0 },
  { key: "minVolPct", label: "Min vol% / tank", step: 0.5, digits: 1 },
  { key: "maxVolPct", label: "Max vol% / tank", step: 0.5, digits: 1 },
];

export function AssayDialog({
  component,
  open,
  onOpenChange,
  onChange,
}: {
  component: Blendstock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<Blendstock>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{component?.name ?? "Blendstock"}</DialogTitle>
          <DialogDescription>
            {component
              ? `Assay and inventory for this stream in the ${regionLabel(component.regionId)} pool. Distillation is D86 °F. Octane numbers are blending octanes.`
              : "Blending assay and tank inventory."}
          </DialogDescription>
        </DialogHeader>
        {component ? (
          <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1">
            {FIELDS.map((field) => (
              <label key={field.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <NumberField
                  value={Number(component[field.key])}
                  digits={field.digits}
                  step={field.step}
                  onChange={(value) => onChange({ [field.key]: value })}
                />
              </label>
            ))}
          </div>
        ) : null}
        <DialogFooter showCloseButton>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
