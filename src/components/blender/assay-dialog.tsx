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
import type { Blendstock } from "@/lib/blend";
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
  { key: "costPerBbl", label: "Cost, $/bbl", step: 0.5, digits: 2 },
  { key: "minVolPct", label: "Min vol%", step: 0.5, digits: 1 },
  { key: "maxVolPct", label: "Max vol%", step: 0.5, digits: 1 },
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{component?.name ?? "Blendstock"}</DialogTitle>
          <DialogDescription>
            Edit the blending assay. Octane numbers here are blending octanes, not neat
            ASTM measurements.
          </DialogDescription>
        </DialogHeader>
        {component ? (
          <div className="grid grid-cols-2 gap-3">
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
