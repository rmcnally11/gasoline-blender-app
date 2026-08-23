"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TankId } from "@/lib/blend";
import { TankCard } from "./tank-card";
import { usePlant } from "./plant-context";
import { AlertTriangle } from "lucide-react";

export function TankPage({ tankId }: { tankId: TankId }) {
  const { plant, solve, tankById, updateTank, updateTankSpecs } = usePlant();
  const tank = tankById(tankId);

  if (!tank) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Tank not found</AlertTitle>
        <AlertDescription>{tankId} is not in the plant.</AlertDescription>
      </Alert>
    );
  }

  return (
    <TankCard
      tank={tank}
      components={plant.components}
      solve={solve}
      complianceOverlay={plant.complianceOverlay}
      onChange={(patch) => updateTank(tank.id, patch)}
      onSpecChange={(patch) => updateTankSpecs(tank.id, patch)}
    />
  );
}
