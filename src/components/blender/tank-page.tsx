"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { componentsForRegion, componentsForTank, regionForSlate, regionLabel, type TankId } from "@/lib/blend";
import { MarketValues } from "./market-values";
import { PoolCard } from "./pool-card";
import { TankCard } from "./tank-card";
import { usePlant } from "./plant-context";
import { AlertTriangle } from "lucide-react";

export function TankPage({ tankId }: { tankId: TankId }) {
  const { plant, solve, tankById, updateTank, updateTankSpecs, updateComponent, setEditingId } = usePlant();
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
    <>
      <TankCard
        tank={tank}
        components={componentsForTank(plant.components, tank)}
        solve={solve}
        complianceOverlay={plant.complianceOverlay}
        onChange={(patch) => updateTank(tank.id, patch)}
        onSpecChange={(patch) => updateTankSpecs(tank.id, patch)}
      />
      <MarketValues
        regionLabel={regionLabel(regionForSlate(tank.slateId))}
        components={componentsForRegion(plant.components, regionForSlate(tank.slateId))}
        onPriceChange={(id, costPerBbl) => updateComponent(id, { costPerBbl })}
      />
      <PoolCard
        plant={plant}
        regionId={regionForSlate(tank.slateId)}
        usedBbl={solve.componentUsedBbl}
        onComponentChange={updateComponent}
        onEdit={setEditingId}
      />
    </>
  );
}
