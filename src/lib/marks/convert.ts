import type { DailyMarks } from "./types";

/** Platts gasoline cents per gallon → LP dollars per barrel (42 gal/bbl). */
export const CPG_TO_BBL = 0.42;

export function cpgToPerBbl(cpg: number): number {
  return cpg * CPG_TO_BBL;
}

/** D6 cents per RIN → $ per RIN. Existing RVO multiplies this by 42 × obligation rate. */
export function d6CtsToPerRin(cts: number): number {
  return cts / 100;
}

export function rvoDollarsPerBbl(d6PerRin: number, obligationRate: number): number {
  return obligationRate * 42 * d6PerRin;
}

export function parseAirtableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const parsed = Number(raw.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatMarksDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "string") {
    const iso = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  }
  return null;
}

export function emptyDailyMarks(partial: Partial<DailyMarks> = {}): DailyMarks {
  return {
    date: null,
    source: "none",
    fetchedAt: null,
    rbCpg: null,
    rbPerBbl: null,
    rbStale: true,
    gcCbobDiffCpg: null,
    gcCbobCpg: null,
    gcCbobPerBbl: null,
    gcCbobStale: true,
    unl87DiffCpg: null,
    unl87Cpg: null,
    unl87PerBbl: null,
    unl87Stale: true,
    cbob93DiffCpg: null,
    cbob93Cpg: null,
    cbob93PerBbl: null,
    cbob93Stale: true,
    ethanolCpg: null,
    ethanolPerBbl: null,
    ethanolStale: true,
    d6Cts: null,
    d6PerRin: null,
    d6Stale: true,
    ...partial,
  };
}

/**
 * Map only the six gasoline Platts Daily fields + Date.
 * ULSD, jet, CARBOB, NYH, Denver, Tampa, curve, EIA, and HTML report
 * fields are ignored even if present on the row.
 */
export function marksFromPlattsFields(fields: Record<string, unknown>, source: DailyMarks["source"] = "airtable"): DailyMarks {
  const date = formatMarksDate(fields.Date);
  const rbCpg = parseAirtableNumber(fields.NYMEX_RB_Implied);
  const gcCbobDiffCpg = parseAirtableNumber(fields.GC_CBOB_Diff);
  const unl87DiffCpg = parseAirtableNumber(fields.GC_Unl87_Diff);
  const cbob93DiffCpg = parseAirtableNumber(fields.GC_CBOB93_Diff);
  const ethanolCpg = parseAirtableNumber(fields.Chi_Ethanol_cpg);
  const d6Cts = parseAirtableNumber(fields.D6_RIN_cts);

  const rbPerBbl = rbCpg === null ? null : cpgToPerBbl(rbCpg);
  const gcCbobCpg = rbCpg === null || gcCbobDiffCpg === null ? null : rbCpg + gcCbobDiffCpg;
  const unl87Cpg = rbCpg === null || unl87DiffCpg === null ? null : rbCpg + unl87DiffCpg;
  const cbob93Cpg = rbCpg === null || cbob93DiffCpg === null ? null : rbCpg + cbob93DiffCpg;

  return emptyDailyMarks({
    date,
    source,
    fetchedAt: new Date().toISOString(),
    rbCpg,
    rbPerBbl,
    rbStale: rbCpg === null,
    gcCbobDiffCpg,
    gcCbobCpg,
    gcCbobPerBbl: gcCbobCpg === null ? null : cpgToPerBbl(gcCbobCpg),
    gcCbobStale: gcCbobCpg === null,
    unl87DiffCpg,
    unl87Cpg,
    unl87PerBbl: unl87Cpg === null ? null : cpgToPerBbl(unl87Cpg),
    unl87Stale: unl87Cpg === null,
    cbob93DiffCpg,
    cbob93Cpg,
    cbob93PerBbl: cbob93Cpg === null ? null : cpgToPerBbl(cbob93Cpg),
    cbob93Stale: cbob93Cpg === null,
    ethanolCpg,
    ethanolPerBbl: ethanolCpg === null ? null : cpgToPerBbl(ethanolCpg),
    ethanolStale: ethanolCpg === null,
    d6Cts,
    d6PerRin: d6Cts === null ? null : d6CtsToPerRin(d6Cts),
    d6Stale: d6Cts === null,
  });
}

/**
 * 21 Aug 2026 sample for unit checks only. Never used as a live fallback.
 * RB 304.68, GC CBOB +0.75, Unl87 +22.75, CBOB93 +41.75, Chi ethanol 209.83, D6 209.25.
 */
export const SAMPLE_PLATTS_FIELDS_21_AUG_2026: Record<string, unknown> = {
  Date: "2026-08-21",
  NYMEX_RB_Implied: 304.68,
  GC_CBOB_Diff: 0.75,
  GC_Unl87_Diff: 22.75,
  GC_CBOB93_Diff: 41.75,
  Chi_Ethanol_cpg: 209.83,
  D6_RIN_cts: 209.25,
};

/** Prior settlement sample for day-over-day checks. Not a live weekend print. */
export const SAMPLE_PLATTS_FIELDS_20_AUG_2026: Record<string, unknown> = {
  Date: "2026-08-20",
  NYMEX_RB_Implied: 300.0,
  GC_CBOB_Diff: 0.5,
  GC_Unl87_Diff: 22.5,
  GC_CBOB93_Diff: 41.5,
  Chi_Ethanol_cpg: 200.0,
  D6_RIN_cts: 200.0,
};
