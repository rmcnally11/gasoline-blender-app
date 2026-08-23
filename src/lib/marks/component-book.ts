import type { ComponentBookRow } from "./types";

/**
 * Streams Platts Daily does not publish. Basis starts empty — the trader types it.
 * Do not invent typical alk / FCC spreads or fake Platts codes.
 */
export const COMPONENT_BOOK_STREAMS: ComponentBookRow[] = [
  { streamKey: "nbutane", name: "n-butane", basisCpg: null, overridePerBbl: null, notes: "" },
  { streamKey: "fcc", name: "FCC gasoline", basisCpg: null, overridePerBbl: null, notes: "" },
  { streamKey: "reformate", name: "reformate", basisCpg: null, overridePerBbl: null, notes: "" },
  { streamKey: "alkylate", name: "alkylate", basisCpg: null, overridePerBbl: null, notes: "" },
  { streamKey: "isomerate", name: "isomerate", basisCpg: null, overridePerBbl: null, notes: "" },
  { streamKey: "lsr", name: "light naphtha", basisCpg: null, overridePerBbl: null, notes: "" },
  { streamKey: "heavy-naphtha", name: "heavy naphtha", basisCpg: null, overridePerBbl: null, notes: "" },
];

export function emptyComponentBook(): ComponentBookRow[] {
  return COMPONENT_BOOK_STREAMS.map((row) => ({ ...row }));
}

export function mergeComponentBook(rows: ComponentBookRow[] | null | undefined): ComponentBookRow[] {
  const incoming = new Map((rows ?? []).map((row) => [row.streamKey, row]));
  return emptyComponentBook().map((seed) => {
    const row = incoming.get(seed.streamKey);
    if (!row) return seed;
    return {
      ...seed,
      basisCpg: row.basisCpg ?? null,
      overridePerBbl: row.overridePerBbl ?? null,
      notes: row.notes ?? "",
    };
  });
}

export function bookPricePerBbl(
  row: ComponentBookRow,
  gcCbobPerBbl: number | null,
): { price: number | null; origin: "override" | "basis" | null; stale: boolean } {
  if (row.overridePerBbl !== null && Number.isFinite(row.overridePerBbl)) {
    return { price: row.overridePerBbl, origin: "override", stale: false };
  }
  if (row.basisCpg !== null && Number.isFinite(row.basisCpg) && gcCbobPerBbl !== null) {
    return { price: gcCbobPerBbl + row.basisCpg * 0.42, origin: "basis", stale: false };
  }
  return { price: null, origin: null, stale: true };
}
