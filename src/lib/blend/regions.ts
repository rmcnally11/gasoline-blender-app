import type { Blendstock, Plant, ProductTank, RegionId, SlateId, TankId } from "./types";

export const REGION_OPTIONS: { id: RegionId; label: string; note: string; slates: SlateId[] }[] = [
  {
    id: "colonial",
    label: "Colonial",
    note: "CPL CBOB. Gulf / East Coast barrels. P1 and P3 start here.",
    slates: ["cpl-cbob"],
  },
  {
    id: "explorer",
    label: "Explorer",
    note: "Explorer CBOB. Midwest barrels. P2 starts here.",
    slates: ["explorer-cbob"],
  },
  {
    id: "west-coast",
    label: "West Coast",
    note: "SFPP CARBOB. Cleaner treated streams, more alkylate.",
    slates: ["sfpp-carbob"],
  },
  {
    id: "mexico",
    label: "Mexico",
    note: "NOM-016 ZMVM and resto share this pool. Specs differ; inventory does not.",
    slates: ["mexico-zmvm", "mexico-resto"],
  },
];

export function regionForSlate(slateId: SlateId): RegionId {
  switch (slateId) {
    case "cpl-cbob":
      return "colonial";
    case "explorer-cbob":
      return "explorer";
    case "sfpp-carbob":
      return "west-coast";
    case "mexico-zmvm":
    case "mexico-resto":
      return "mexico";
  }
}

export function regionLabel(regionId: RegionId): string {
  return REGION_OPTIONS.find((region) => region.id === regionId)?.label ?? regionId;
}

export function regionNote(regionId: RegionId): string {
  return REGION_OPTIONS.find((region) => region.id === regionId)?.note ?? "";
}

export function componentsForRegion(components: Blendstock[], regionId: RegionId): Blendstock[] {
  return components.filter((component) => component.regionId === regionId);
}

export function componentsForTank(components: Blendstock[], tank: ProductTank): Blendstock[] {
  return componentsForRegion(components, regionForSlate(tank.slateId));
}

export function tanksOnRegion(tanks: ProductTank[], regionId: RegionId): ProductTank[] {
  return tanks.filter((tank) => regionForSlate(tank.slateId) === regionId);
}

export function tankIdsOnRegion(plant: Plant, regionId: RegionId): TankId[] {
  return tanksOnRegion(plant.tanks, regionId).map((tank) => tank.id);
}
