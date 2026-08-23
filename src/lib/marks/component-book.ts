import type { BookStreamKey, ComponentBookRow, ComponentBookSource } from "./types";

/**
 * Streams Platts Daily does not publish. Basis starts empty — the trader types it.
 * Do not invent typical alk / FCC spreads or fake Platts codes.
 */
export const BOOK_STREAM_KEYS: BookStreamKey[] = [
  "nbutane",
  "fcc",
  "reformate",
  "alkylate",
  "isomerate",
  "lsr",
  "heavy-naphtha",
];

export const COMPONENT_BOOK_STREAMS: ComponentBookRow[] = [
  { streamKey: "nbutane", name: "n-butane", basisCpg: null, overridePerBbl: null, notes: "", source: "stale" },
  { streamKey: "fcc", name: "FCC gasoline", basisCpg: null, overridePerBbl: null, notes: "", source: "stale" },
  { streamKey: "reformate", name: "reformate", basisCpg: null, overridePerBbl: null, notes: "", source: "stale" },
  { streamKey: "alkylate", name: "alkylate", basisCpg: null, overridePerBbl: null, notes: "", source: "stale" },
  { streamKey: "isomerate", name: "isomerate", basisCpg: null, overridePerBbl: null, notes: "", source: "stale" },
  { streamKey: "lsr", name: "light naphtha", basisCpg: null, overridePerBbl: null, notes: "", source: "stale" },
  { streamKey: "heavy-naphtha", name: "heavy naphtha", basisCpg: null, overridePerBbl: null, notes: "", source: "stale" },
];

export function isBookStreamKey(value: string): value is BookStreamKey {
  return (BOOK_STREAM_KEYS as string[]).includes(value);
}

export function emptyComponentBook(): ComponentBookRow[] {
  return COMPONENT_BOOK_STREAMS.map((row) => ({ ...row }));
}

export function bookHasLivePrice(
  row: Pick<ComponentBookRow, "basisCpg" | "overridePerBbl"> | Partial<ComponentBookRow>,
): boolean {
  return (
    (row.overridePerBbl !== null && row.overridePerBbl !== undefined && Number.isFinite(row.overridePerBbl)) ||
    (row.basisCpg !== null && row.basisCpg !== undefined && Number.isFinite(row.basisCpg))
  );
}

export function bookSourceOf(
  row: Partial<ComponentBookRow> | null | undefined,
): ComponentBookSource {
  if (!bookHasLivePrice(row ?? {})) return "stale";
  if (row?.source === "airtable" || row?.source === "typed") return row.source;
  return "typed";
}

export function mergeComponentBook(rows: ComponentBookRow[] | null | undefined): ComponentBookRow[] {
  const incoming = new Map((rows ?? []).map((row) => [row.streamKey, row]));
  return emptyComponentBook().map((seed) => {
    const row = incoming.get(seed.streamKey);
    if (!row) return seed;
    const basisCpg = row.basisCpg ?? null;
    const overridePerBbl = row.overridePerBbl ?? null;
    return {
      ...seed,
      basisCpg,
      overridePerBbl,
      notes: row.notes ?? "",
      source: bookSourceOf({ ...row, basisCpg, overridePerBbl }),
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
