"use client";

import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { componentsForRegion, componentsForTank, regionForSlate, regionLabel, type TankId } from "@/lib/blend";
import { MarketValues } from "./market-values";
import { MarksHeader } from "./marks-header";
import { MobileWorkspace } from "./mobile-workspace";
import { PoolCard } from "./pool-card";
import { TankCard } from "./tank-card";
import { usePlant } from "./plant-context";
import { AlertTriangle } from "lucide-react";

export function TankPage({ tankId }: { tankId: TankId }) {
  const {
    plant,
    solve,
    tankById,
    updateTank,
    updateTankSpecs,
    updateComponent,
    setEditingId,
    setActiveRegion,
    seeks,
    busy,
    runSeek,
  } = usePlant();
  const tank = tankById(tankId);

  useEffect(() => {
    if (tank) setActiveRegion(regionForSlate(tank.slateId));
  }, [tank, setActiveRegion]);

  if (!tank) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Tank not found</AlertTitle>
        <AlertDescription>{tankId} is not in the plant.</AlertDescription>
      </Alert>
    );
  }

  const tankProps = {
    tank,
    components: componentsForTank(plant.components, tank),
    solve,
    complianceOverlay: plant.complianceOverlay,
    onChange: (patch: Parameters<typeof updateTank>[1]) => updateTank(tank.id, patch),
    onSpecChange: (patch: Parameters<typeof updateTankSpecs>[1]) => updateTankSpecs(tank.id, patch),
  };

  return (
    <MobileWorkspace
      storageKey={`tank-${tankId}`}
      defaultSection="lift"
      desktop={
        <>
          <TankCard {...tankProps} />
          <MarketValues
            regionLabel={regionLabel(regionForSlate(tank.slateId))}
            components={componentsForRegion(plant.components, regionForSlate(tank.slateId))}
            seeks={seeks}
            busy={busy === "seek"}
            onPriceChange={(id, costPerBbl) => updateComponent(id, { costPerBbl })}
            onMustUseChange={(id, minLiftBbl) => updateComponent(id, { minLiftBbl })}
            onSeek={runSeek}
          />
          <PoolCard
            plant={plant}
            regionId={regionForSlate(tank.slateId)}
            usedBbl={solve.componentUsedBbl}
            onComponentChange={updateComponent}
            onEdit={setEditingId}
          />
        </>
      }
      sections={[
        {
          id: "lift",
          label: "Lift",
          content: (
            <>
              <div className="md:hidden">
                <MarksHeader />
              </div>
              <TankCard {...tankProps} view="setup" />
            </>
          ),
        },
        { id: "specs", label: "Specs", content: <TankCard {...tankProps} view="specs" /> },
        {
          id: "book",
          label: "Book",
          content: (
            <MarketValues
              regionLabel={regionLabel(regionForSlate(tank.slateId))}
              components={componentsForRegion(plant.components, regionForSlate(tank.slateId))}
              seeks={seeks}
              busy={busy === "seek"}
              onPriceChange={(id, costPerBbl) => updateComponent(id, { costPerBbl })}
              onMustUseChange={(id, minLiftBbl) => updateComponent(id, { minLiftBbl })}
              onSeek={runSeek}
            />
          ),
        },
        {
          id: "pool",
          label: "Pool",
          content: (
            <PoolCard
              plant={plant}
              regionId={regionForSlate(tank.slateId)}
              usedBbl={solve.componentUsedBbl}
              onComponentChange={updateComponent}
              onEdit={setEditingId}
            />
          ),
        },
      ]}
    />
  );
}
