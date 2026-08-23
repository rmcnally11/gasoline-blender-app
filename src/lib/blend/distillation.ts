import type { Blendstock } from "./types";

/** ASTM D4814 driveability index, °F, plus the ethanol offset. */
export function driveabilityIndex(t10F: number, t50F: number, t90F: number, ethanolVolPct: number): number {
  return 1.5 * t10F + 3.0 * t50F + t90F + 2.4 * ethanolVolPct;
}

export function componentDiBase(component: Blendstock): number {
  return 1.5 * component.t10F + 3.0 * component.t50F + component.t90F;
}
