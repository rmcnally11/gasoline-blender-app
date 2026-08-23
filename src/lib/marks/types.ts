export type BookStreamKey =
  | "nbutane"
  | "fcc"
  | "reformate"
  | "alkylate"
  | "isomerate"
  | "lsr"
  | "heavy-naphtha";

export type MarksSource = "airtable" | "none";
export type MarksLoadState = "idle" | "loading" | "ok" | "missing_token" | "error";

/** Latest Platts Daily gasoline fields only. Empty fields are null + stale. */
export interface DailyMarks {
  date: string | null;
  source: MarksSource;
  fetchedAt: string | null;
  rbCpg: number | null;
  rbPerBbl: number | null;
  rbStale: boolean;
  gcCbobDiffCpg: number | null;
  gcCbobCpg: number | null;
  gcCbobPerBbl: number | null;
  gcCbobStale: boolean;
  unl87DiffCpg: number | null;
  unl87Cpg: number | null;
  unl87PerBbl: number | null;
  unl87Stale: boolean;
  cbob93DiffCpg: number | null;
  cbob93Cpg: number | null;
  cbob93PerBbl: number | null;
  cbob93Stale: boolean;
  ethanolCpg: number | null;
  ethanolPerBbl: number | null;
  ethanolStale: boolean;
  /** Raw D6, cents per RIN. */
  d6Cts: number | null;
  /** $ per RIN — what existing RVO code expects. */
  d6PerRin: number | null;
  d6Stale: boolean;
}

export type ComponentBookSource = "airtable" | "typed" | "stale";

export interface ComponentBookRow {
  streamKey: BookStreamKey;
  name: string;
  /** Basis vs GC CBOB, cents per gallon. Empty until the trader types it. */
  basisCpg: number | null;
  /** Absolute $/bbl. Wins over basis when set. */
  overridePerBbl: number | null;
  notes: string;
  /** Where this row's basis/override came from. Empty Airtable is stale, not a typical spread. */
  source: ComponentBookSource;
}

export type MarksFetchFailure = "missing_token" | "airtable_error" | "empty";

export type MarksFetchOk = { ok: true; marks: DailyMarks };
export type MarksFetchFail = {
  ok: false;
  reason: MarksFetchFailure;
  message: string;
};
export type MarksFetchResult = MarksFetchOk | MarksFetchFail;

export type ComponentBookFetchResult =
  | { ok: true; rows: ComponentBookRow[] }
  | { ok: false; reason: MarksFetchFailure; message: string };

/** Latest + prior Platts Daily rows and the Component Book table. */
export type MarksApiPayload = MarksFetchResult & {
  priorMarks: DailyMarks | null;
  book: ComponentBookFetchResult;
};
