"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { componentsForTank, regionForSlate, type TankId } from "@/lib/blend";
import { MarksHeader } from "./marks-header";
import { MobileWorkspace } from "./mobile-workspace";
import { TankCard } from "./tank-card";
import { usePlant } from "./plant-context";
import { AlertTriangle } from "lucide-react";

export function TankPage({ tankId }: { tankId: TankId }) {
  const { plant, solve, tankById, updateTank, updateTankSpecs, setActiveRegion } = usePlant();
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

  const inputsNote = (
    <p className="text-xs text-muted-foreground">
      Component use, inventory, market $/gal, and basis live on{" "}
      <Link href="/inputs" className="text-sky-800 underline underline-offset-2">
        Inputs
      </Link>
      . This page is the ticket and the spec.
    </p>
  );

  return (
    <MobileWorkspace
      storageKey={`tank-${tankId}`}
      defaultSection="ticket"
      desktop={
        <>
          {inputsNote}
          <TankCard {...tankProps} />
        </>
      }
      sections={[
        {
          id: "ticket",
          label: "Ticket",
          content: (
            <>
              <MarksHeader />
              {inputsNote}
              <TankCard {...tankProps} view="setup" />
            </>
          ),
        },
        { id: "specs", label: "Specs", content: <TankCard {...tankProps} view="specs" /> },
      ]}
    />
  );
}
