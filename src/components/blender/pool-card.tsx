"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  componentsForRegion,
  regionLabel,
  regionNote,
  tanksOnRegion,
  type Blendstock,
  type Plant,
  type RegionId,
} from "@/lib/blend";
import { BlendstockTable } from "./blendstock-table";

export function PoolCard({
  plant,
  regionId,
  usedBbl,
  onComponentChange,
  onEdit,
}: {
  plant: Plant;
  regionId: RegionId;
  usedBbl: Record<string, number>;
  onComponentChange: (id: string, patch: Partial<Blendstock>) => void;
  onEdit: (id: string) => void;
}) {
  const tanks = tanksOnRegion(plant.tanks, regionId);
  const names = tanks.map((tank) => tank.id).join(" and ");
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>{regionLabel(regionId)} blend pool</CardTitle>
        <CardDescription>
          {regionNote(regionId)}{" "}
          {tanks.length > 0
            ? `${names} ${tanks.length === 1 ? "draws" : "draw"} these barrels. Other regions cannot.`
            : "No tank is on this region yet. Switch a tank slate to use these barrels."}{" "}
          Market prices are $/gal on the component book. Use the pencil for the assay.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BlendstockTable
          components={componentsForRegion(plant.components, regionId)}
          usedBbl={usedBbl}
          onComponentChange={onComponentChange}
          onEdit={onEdit}
        />
      </CardContent>
    </Card>
  );
}
