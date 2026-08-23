/** Chevron / industry RVP blending index: BI = RVP^1.25 */
export const RVP_BLEND_EXPONENT = 1.25;

export function rvpBlendingIndex(rvpPsi: number): number {
  const safe = Math.max(rvpPsi, 0);
  return safe ** RVP_BLEND_EXPONENT;
}

export function rvpFromBlendingIndex(index: number): number {
  if (index <= 0) return 0;
  return index ** (1 / RVP_BLEND_EXPONENT);
}

export function aki(ron: number, mon: number): number {
  return (ron + mon) / 2;
}

export function almostEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

export function gallonsPerBarrel(): number {
  return 42;
}
