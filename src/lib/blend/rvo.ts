import { gallonsPerBarrel } from "./math";
import type { Blendstock, RvoSettings } from "./types";

export function rvoCostPerFinishedBbl(rvo: RvoSettings): number {
  if (!rvo.enabled) return 0;
  return rvo.obligationRate * gallonsPerBarrel() * rvo.d6RinPrice;
}

export function rinCreditPerEthanolBbl(rvo: RvoSettings): number {
  if (!rvo.enabled) return 0;
  return rvo.ethanolRinsPerGal * gallonsPerBarrel() * rvo.d6RinPrice;
}

export function rvoNetCost(rvo: RvoSettings, finishedBbl: number, ethanolBbl: number): number {
  return rvoCostPerFinishedBbl(rvo) * finishedBbl - rinCreditPerEthanolBbl(rvo) * ethanolBbl;
}

export function isEthanol(component: Blendstock): boolean {
  return component.id === "ethanol";
}

export const DEFAULT_RVO: RvoSettings = {
  enabled: true,
  obligationRate: 0.15,
  d6RinPrice: 0.85,
  ethanolRinsPerGal: 1,
};
