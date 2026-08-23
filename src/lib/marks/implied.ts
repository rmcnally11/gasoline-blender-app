import { impliedComponentValue } from "@/lib/blend/goalseek";
import type { Plant } from "@/lib/blend/types";

/** Same LP indifference price the naphtha seek uses. Used components only. */
export function impliedValuesForUsed(
  plant: Plant,
  usedBbl: Record<string, number>,
): Record<string, number | null> {
  const implied: Record<string, number | null> = {};
  for (const [id, barrels] of Object.entries(usedBbl)) {
    if (barrels <= 1e-6) continue;
    const component = plant.components.find((item) => item.id === id);
    if (!component) continue;
    implied[id] = impliedComponentValue(plant, component.regionId, id);
  }
  return implied;
}
