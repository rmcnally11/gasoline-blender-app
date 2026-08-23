"use client";

import { REGION_OPTIONS, tanksOnRegion, type Plant, type RegionId } from "@/lib/blend";

export function RegionSwitcher({
  plant,
  value,
  onChange,
}: {
  plant: Plant;
  value: RegionId;
  onChange: (regionId: RegionId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {REGION_OPTIONS.map((region) => {
        const tanks = tanksOnRegion(plant.tanks, region.id)
          .filter((tank) => tank.enabled)
          .map((tank) => tank.id);
        const active = value === region.id;
        return (
          <button
            key={region.id}
            type="button"
            onClick={() => onChange(region.id)}
            className={`rounded-lg px-2.5 py-1.5 text-sm ${
              active
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {region.label}
            {tanks.length > 0 ? (
              <span className={active ? "ml-1.5 opacity-80" : "ml-1.5 text-foreground/70"}>{tanks.join(" · ")}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
