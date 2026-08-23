import { gallonsPerBarrel } from "./math";
import { isExportSlate } from "./specs";
import type { Blendstock, ProductTank, RvoSettings, SlateId } from "./types";

export function isEthanol(component: Blendstock): boolean {
  return component.streamKey === "ethanol";
}

export function rvoAppliesToSlate(rvo: RvoSettings, slateId: SlateId): boolean {
  return rvo.enabled && !isExportSlate(slateId);
}

export function rvoAppliesToTank(rvo: RvoSettings, tank: Pick<ProductTank, "slateId">): boolean {
  return rvoAppliesToSlate(rvo, tank.slateId);
}

export function neatEthanolBbl(denaturedEthanolBbl: number, rvo: RvoSettings): number {
  return Math.max(0, denaturedEthanolBbl) * (1 - clampDenaturant(rvo.denaturantVolFrac));
}

export function hydrocarbonBbl(finishedBbl: number, denaturedEthanolBbl: number, rvo: RvoSettings): number {
  return Math.max(0, finishedBbl - neatEthanolBbl(denaturedEthanolBbl, rvo));
}

function clampDenaturant(frac: number): number {
  if (!Number.isFinite(frac)) return 0.02;
  return Math.min(0.1, Math.max(0, frac));
}

/** Obligation $ per hydrocarbon barrel (not per finished barrel). */
export function rvoObligationPerHydrocarbonBbl(rvo: RvoSettings): number {
  if (!rvo.enabled) return 0;
  return rvo.obligationRate * gallonsPerBarrel() * rvo.d6RinPrice;
}

/** RIN credit $ per neat ethanol barrel. */
export function rinCreditPerNeatEthanolBbl(rvo: RvoSettings): number {
  if (!rvo.enabled) return 0;
  return rvo.ethanolRinsPerGal * gallonsPerBarrel() * rvo.d6RinPrice;
}

export function tankRvoDollars(
  rvo: RvoSettings,
  tank: Pick<ProductTank, "slateId">,
  finishedBbl: number,
  denaturedEthanolBbl: number,
): { obligation: number; credit: number; net: number } {
  if (!rvoAppliesToTank(rvo, tank) || finishedBbl <= 0) {
    return { obligation: 0, credit: 0, net: 0 };
  }
  const obligation = rvoObligationPerHydrocarbonBbl(rvo) * hydrocarbonBbl(finishedBbl, denaturedEthanolBbl, rvo);
  const credit = rinCreditPerNeatEthanolBbl(rvo) * neatEthanolBbl(denaturedEthanolBbl, rvo);
  return { obligation, credit, net: obligation - credit };
}

/** Objective coefficient: RVO $ added per barrel of this stream into this tank. */
export function rvoCostCoeff(
  rvo: RvoSettings,
  tank: Pick<ProductTank, "slateId">,
  component: Blendstock,
): number {
  if (!rvoAppliesToTank(rvo, tank)) return 0;
  if (isEthanol(component)) {
    const denat = clampDenaturant(rvo.denaturantVolFrac);
    const neatFrac = 1 - denat;
    // Ethanol gallons are not obligated. Denaturant in the splash is hydrocarbon and is obligated.
    // Credit RINs on the neat cut only.
    return denat * rvoObligationPerHydrocarbonBbl(rvo) - neatFrac * rinCreditPerNeatEthanolBbl(rvo);
  }
  return rvoObligationPerHydrocarbonBbl(rvo);
}

/** Last-typed placeholder only. Never label $0.85 as a Platts D6 mark. */
export const DEFAULT_RVO: RvoSettings = {
  enabled: true,
  obligationRate: 0.15,
  d6RinPrice: 0.85,
  d6Cts: null,
  d6Stale: true,
  ethanolRinsPerGal: 1,
  denaturantVolFrac: 0.02,
};
