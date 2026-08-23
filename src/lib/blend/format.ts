export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatSigned(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = formatNumber(Math.abs(value), digits);
  if (Math.abs(value) < 10 ** -digits / 2) return formatNumber(0, digits);
  return value > 0 ? `+${abs}` : `−${abs}`;
}

export function formatMoney(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${formatNumber(value, digits)}`;
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, digits)}%`;
}

export function formatBbl(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, digits)} bbl`;
}

export function barrelsToGallons(barrels: number): number {
  return barrels * 42;
}

export function perGallon(totalDollars: number | null | undefined, barrels: number): number | null {
  if (totalDollars === null || totalDollars === undefined || Number.isNaN(totalDollars) || barrels <= 0) {
    return null;
  }
  return totalDollars / barrelsToGallons(barrels);
}

export function formatPerGal(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${formatNumber(value, digits)}/gal`;
}

export function perGalFromBbl(dollarsPerBbl: number): number {
  return dollarsPerBbl / 42;
}

export function perBblFromGal(dollarsPerGal: number): number {
  return dollarsPerGal * 42;
}
