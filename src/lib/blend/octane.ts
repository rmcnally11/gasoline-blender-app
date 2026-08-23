import { aki } from "./math";
import type { Blendstock, BonUsed, EthanolMode, HeelQuality } from "./types";

/** Extra BON points ethanol gets in an E10 splash versus its standalone blending number. */
export const ETHANOL_E10_SYNERGY = { ron: 2.5, mon: 1.0 };

export function blendingRonOf(component: Blendstock, ethanolMode: EthanolMode): number {
  if (component.streamKey === "ethanol" && ethanolMode === "e10") {
    return component.blendingRon + ETHANOL_E10_SYNERGY.ron;
  }
  return component.blendingRon;
}

export function blendingMonOf(component: Blendstock, ethanolMode: EthanolMode): number {
  if (component.streamKey === "ethanol" && ethanolMode === "e10") {
    return component.blendingMon + ETHANOL_E10_SYNERGY.mon;
  }
  return component.blendingMon;
}

export function blendingAkiOf(component: Blendstock, ethanolMode: EthanolMode): number {
  return aki(blendingRonOf(component, ethanolMode), blendingMonOf(component, ethanolMode));
}

export function heelAki(heel: HeelQuality): number {
  return aki(heel.ron, heel.mon);
}

export function defaultBlendingOctane(streamKey: Blendstock["streamKey"], ron: number, mon: number): {
  blendingRon: number;
  blendingMon: number;
} {
  if (streamKey === "ethanol") {
    return { blendingRon: 113, blendingMon: 95 };
  }
  return { blendingRon: ron, blendingMon: mon };
}

export function bonNote(component: Blendstock, ethanolMode: EthanolMode): string {
  const ron = blendingRonOf(component, ethanolMode);
  const mon = blendingMonOf(component, ethanolMode);
  if (component.streamKey === "ethanol" && ethanolMode === "e10") {
    return `BON ${ron.toFixed(1)}/${mon.toFixed(1)} (base ${component.blendingRon.toFixed(1)}/${component.blendingMon.toFixed(1)} + E10 synergy ${ETHANOL_E10_SYNERGY.ron}/${ETHANOL_E10_SYNERGY.mon})`;
  }
  if (component.streamKey === "ethanol" || component.streamKey === "fcc") {
    return `BON ${ron.toFixed(1)}/${mon.toFixed(1)}`;
  }
  if (Math.abs(component.blendingRon - component.ron) > 0.05 || Math.abs(component.blendingMon - component.mon) > 0.05) {
    return `BON ${ron.toFixed(1)}/${mon.toFixed(1)} (neat ${component.ron.toFixed(1)}/${component.mon.toFixed(1)})`;
  }
  return `BON ${ron.toFixed(1)}/${mon.toFixed(1)} (neat)`;
}

export function bonsUsedFor(components: Blendstock[], ethanolMode: EthanolMode, usedIds: string[]): BonUsed[] {
  return components
    .filter((component) => usedIds.includes(component.id) || component.streamKey === "ethanol" || component.streamKey === "fcc")
    .map((component) => ({
      id: component.id,
      name: component.name,
      streamKey: component.streamKey,
      blendingRon: blendingRonOf(component, ethanolMode),
      blendingMon: blendingMonOf(component, ethanolMode),
      note: bonNote(component, ethanolMode),
    }));
}
