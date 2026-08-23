import { emptyComponentBook, isBookStreamKey, mergeComponentBook } from "./component-book";
import { emptyDailyMarks, marksFromPlattsFields, parseAirtableNumber } from "./convert";
import type {
  BookStreamKey,
  ComponentBookFetchResult,
  ComponentBookRow,
  DailyMarks,
  MarksApiPayload,
  MarksFetchFailure,
  MarksFetchResult,
} from "./types";

const DEFAULT_BASE_ID = "appokfrHKXUhGXjVo";
const DEFAULT_PLATTS_TABLE_ID = "tbl5y8ORe6aOumuJn";
const DEFAULT_BOOK_TABLE_ID = "tblSOLXJnXczeLJ07";
const CACHE_TTL_MS = 60_000;

let cache: { expires: number; result: MarksApiPayload } | null = null;

function airtableToken(): string | null {
  const token = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN || "";
  return token.trim() || null;
}

function baseId(): string {
  return (process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim();
}

function plattsTableId(): string {
  return (process.env.AIRTABLE_PLATTS_TABLE_ID || DEFAULT_PLATTS_TABLE_ID).trim();
}

function bookTableId(): string {
  return (process.env.AIRTABLE_COMPONENT_BOOK_TABLE_ID || DEFAULT_BOOK_TABLE_ID).trim();
}

export function plattsDailyUrl(): string {
  return `https://airtable.com/${baseId()}/${plattsTableId()}`;
}

export function componentBookUrl(): string {
  return `https://airtable.com/${baseId()}/${bookTableId()}`;
}

function missingTokenMessage(): string {
  return "AIRTABLE_API_KEY is not set. Marks are missing — last typed placeholders are not Platts.";
}

function fail(reason: MarksFetchFailure, message: string): MarksFetchResult {
  return { ok: false, reason, message };
}

function bookFail(reason: MarksFetchFailure, message: string): ComponentBookFetchResult {
  return { ok: false, reason, message };
}

type AirtableRecord = { fields?: Record<string, unknown> };

async function airtableGet(
  table: string,
  params: URLSearchParams,
  token: string,
): Promise<{ records: AirtableRecord[]; offset?: string } | { error: MarksFetchResult }> {
  const url = `https://api.airtable.com/v0/${baseId()}/${table}?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    return { error: fail("airtable_error", `Airtable ${response.status}. ${body.slice(0, 180)}`) };
  }
  const payload = (await response.json()) as { records?: AirtableRecord[]; offset?: string };
  return { records: payload.records ?? [], offset: payload.offset };
}

function mapPlattsRecord(fields: Record<string, unknown> | undefined): DailyMarks | null {
  if (!fields) return null;
  const marks = marksFromPlattsFields(fields, "airtable");
  if (!marks.date && marks.rbStale && marks.ethanolStale && marks.d6Stale) return null;
  return marks;
}

/**
 * Latest Platts Daily row and the previous Date row (Friday if the weekend has no print).
 * Does not invent a Sunday settlement.
 */
export async function fetchLatestAndPriorPlattsDaily(): Promise<{
  latest: MarksFetchResult;
  priorMarks: DailyMarks | null;
}> {
  const token = airtableToken();
  if (!token) {
    return { latest: fail("missing_token", missingTokenMessage()), priorMarks: null };
  }

  const params = new URLSearchParams({
    maxRecords: "2",
    "sort[0][field]": "Date",
    "sort[0][direction]": "desc",
  });

  try {
    const page = await airtableGet(plattsTableId(), params, token);
    if ("error" in page) return { latest: page.error, priorMarks: null };
    const latest = mapPlattsRecord(page.records[0]?.fields);
    if (!latest) {
      return {
        latest: fail("empty", page.records[0] ? "Latest Platts Daily row has no gasoline fields. Marks are missing." : "Platts Daily has no rows. Marks are missing."),
        priorMarks: null,
      };
    }
    const priorMarks = mapPlattsRecord(page.records[1]?.fields);
    return { latest: { ok: true, marks: latest }, priorMarks };
  } catch (error) {
    return {
      latest: fail("airtable_error", error instanceof Error ? error.message : "Airtable fetch failed."),
      priorMarks: null,
    };
  }
}

export function rowsFromComponentBookRecords(records: AirtableRecord[]): ComponentBookRow[] {
  const incoming: ComponentBookRow[] = [];
  for (const record of records) {
    const rawKey = typeof record.fields?.streamKey === "string" ? record.fields.streamKey.trim() : "";
    if (!isBookStreamKey(rawKey)) continue;
    const streamKey: BookStreamKey = rawKey;
    const basisCpg = parseAirtableNumber(record.fields?.basisCpg);
    const overridePerBbl = parseAirtableNumber(record.fields?.overridePerBbl);
    const name = typeof record.fields?.name === "string" && record.fields.name.trim()
      ? record.fields.name.trim()
      : emptyComponentBook().find((row) => row.streamKey === streamKey)?.name ?? streamKey;
    const notes = typeof record.fields?.notes === "string" ? record.fields.notes : "";
    incoming.push({
      streamKey,
      name,
      basisCpg,
      overridePerBbl,
      notes,
      source: basisCpg !== null || overridePerBbl !== null ? "airtable" : "stale",
    });
  }
  return mergeComponentBook(incoming);
}

export async function fetchComponentBookFromAirtable(): Promise<ComponentBookFetchResult> {
  const token = airtableToken();
  if (!token) {
    return bookFail(
      "missing_token",
      "AIRTABLE_API_KEY is not set. Component Book was not pulled — empty basis is stale, not a typical alk/FCC spread.",
    );
  }

  try {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);
      const page = await airtableGet(bookTableId(), params, token);
      if ("error" in page) {
        const err = page.error.ok ? { reason: "airtable_error" as const, message: "Airtable error." } : page.error;
        return bookFail(err.reason, `Component Book fetch failed. ${err.message}`);
      }
      records.push(...page.records);
      offset = page.offset;
    } while (offset);

    return { ok: true, rows: rowsFromComponentBookRecords(records) };
  } catch (error) {
    return bookFail(
      "airtable_error",
      error instanceof Error ? `Component Book fetch failed. ${error.message}` : "Component Book fetch failed.",
    );
  }
}

export async function fetchMarksAndBook(options: { bypassCache?: boolean } = {}): Promise<MarksApiPayload> {
  if (!options.bypassCache && cache && cache.expires > Date.now()) {
    return cache.result;
  }

  const [platts, book] = await Promise.all([fetchLatestAndPriorPlattsDaily(), fetchComponentBookFromAirtable()]);
  const result: MarksApiPayload = platts.latest.ok
    ? { ok: true, marks: platts.latest.marks, priorMarks: platts.priorMarks, book }
    : { ...platts.latest, priorMarks: platts.priorMarks, book };

  if (result.ok || result.book.ok) {
    cache = { expires: Date.now() + CACHE_TTL_MS, result };
  }
  return result;
}

/**
 * Latest Platts Daily row by Date. Maps only RB, GC CBOB / Unl87 / CBOB93 diffs,
 * Chicago ethanol, and D6. Does not invent a dummy rack or RIN when the token
 * or a field is missing.
 */
export async function fetchLatestPlattsDaily(options: { bypassCache?: boolean } = {}): Promise<MarksFetchResult> {
  const payload = await fetchMarksAndBook(options);
  return payload.ok ? { ok: true, marks: payload.marks } : { ok: false, reason: payload.reason, message: payload.message };
}

export function missingMarksResult(): MarksFetchResult {
  return fail("missing_token", missingTokenMessage());
}

export function noMarksFallback() {
  return emptyDailyMarks();
}
