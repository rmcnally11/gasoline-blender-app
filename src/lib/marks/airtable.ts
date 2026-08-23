import { emptyDailyMarks, marksFromPlattsFields } from "./convert";
import type { MarksFetchResult } from "./types";

const DEFAULT_BASE_ID = "appokfrHKXUhGXjVo";
const DEFAULT_TABLE_ID = "tbl5y8ORe6aOumuJn";
const CACHE_TTL_MS = 60_000;

let cache: { expires: number; result: MarksFetchResult } | null = null;

function airtableToken(): string | null {
  const token = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN || "";
  return token.trim() || null;
}

function baseId(): string {
  return (process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim();
}

function tableId(): string {
  return (process.env.AIRTABLE_PLATTS_TABLE_ID || DEFAULT_TABLE_ID).trim();
}

export function plattsDailyUrl(): string {
  return `https://airtable.com/${baseId()}/${tableId()}`;
}

/**
 * Latest Platts Daily row by Date. Maps only RB, GC CBOB / Unl87 / CBOB93 diffs,
 * Chicago ethanol, and D6. Does not invent a dummy rack or RIN when the token
 * or a field is missing.
 */
export async function fetchLatestPlattsDaily(options: { bypassCache?: boolean } = {}): Promise<MarksFetchResult> {
  if (!options.bypassCache && cache && cache.expires > Date.now()) {
    return cache.result;
  }

  const token = airtableToken();
  if (!token) {
    const result: MarksFetchResult = {
      ok: false,
      reason: "missing_token",
      message: "AIRTABLE_API_KEY is not set. Marks are missing — last typed placeholders are not Platts.",
    };
    return result;
  }

  const params = new URLSearchParams({
    maxRecords: "1",
    "sort[0][field]": "Date",
    "sort[0][direction]": "desc",
  });
  const url = `https://api.airtable.com/v0/${baseId()}/${tableId()}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text();
      const result: MarksFetchResult = {
        ok: false,
        reason: "airtable_error",
        message: `Airtable ${response.status}. ${body.slice(0, 180)}`,
      };
      return result;
    }
    const payload = (await response.json()) as { records?: { fields?: Record<string, unknown> }[] };
    const fields = payload.records?.[0]?.fields;
    if (!fields) {
      const result: MarksFetchResult = {
        ok: false,
        reason: "empty",
        message: "Platts Daily has no rows. Marks are missing.",
      };
      return result;
    }
    const marks = marksFromPlattsFields(fields, "airtable");
    if (!marks.date && marks.rbStale && marks.ethanolStale && marks.d6Stale) {
      const result: MarksFetchResult = {
        ok: false,
        reason: "empty",
        message: "Latest Platts Daily row has no gasoline fields. Marks are missing.",
      };
      return result;
    }
    const result: MarksFetchResult = { ok: true, marks };
    cache = { expires: Date.now() + CACHE_TTL_MS, result };
    return result;
  } catch (error) {
    return {
      ok: false,
      reason: "airtable_error",
      message: error instanceof Error ? error.message : "Airtable fetch failed.",
    };
  }
}

export function missingMarksResult(): MarksFetchResult {
  return {
    ok: false,
    reason: "missing_token",
    message: "AIRTABLE_API_KEY is not set. Marks are missing — last typed placeholders are not Platts.",
    // marks omitted on purpose — callers must not treat defaults as Platts
  };
}

export function noMarksFallback() {
  return emptyDailyMarks();
}
