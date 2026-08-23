"use client";

import { formatMoney, formatNumber } from "@/lib/blend";
import { rvoDollarsPerBbl } from "@/lib/marks/convert";
import { ActionButton } from "./action-button";
import { usePlant } from "./plant-context";

function Stale({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-1 text-[10px] font-medium tracking-wide text-amber-800 uppercase">stale / missing</span>;
}

export function MarksHeader() {
  const { plant, busy, refreshMarks } = usePlant();
  const marks = plant.marks;
  const missing =
    plant.marksLoadState === "missing_token" ||
    plant.marksLoadState === "error" ||
    marks.source === "none" ||
    !marks.date;

  return (
    <section className="rounded-xl border border-border bg-card/80 px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-amber-800 uppercase">
            {missing ? "Marks missing" : `Marks as of ${marks.date}`}
          </p>
          {missing ? (
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              {plant.marksLoadError ??
                "No Platts Daily row. Last typed rack / ethanol / D6 stay on the page and are flagged stale — they are not the dummy $104.16 rack or $0.85 RIN from defaults."}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Platts Daily, latest row. Cents/gal × 0.42 = $/bbl. D6 is cts/RIN → $/RIN for RVO.
            </p>
          )}
        </div>
        <ActionButton
          className="w-full md:w-auto"
          variant="outline"
          onClick={refreshMarks}
          busy={busy === "marks"}
          disabled={busy !== null}
        >
          {busy === "marks" ? "Pulling marks…" : "Refresh marks"}
        </ActionButton>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Mark
          label="NYMEX RB"
          primary={marks.rbCpg === null ? "—" : `${formatNumber(marks.rbCpg, 2)} cpg`}
          secondary={marks.rbPerBbl === null ? "no $/bbl" : `${formatMoney(marks.rbPerBbl, 4)}/bbl`}
          stale={marks.rbStale}
        />
        <Mark
          label="GC CBOB rack"
          primary={
            marks.gcCbobCpg === null
              ? "—"
              : `${formatNumber(marks.gcCbobCpg, 2)} cpg (${marks.gcCbobDiffCpg === null ? "no diff" : `${formatNumber(marks.gcCbobDiffCpg, 2)} vs RB`})`
          }
          secondary={marks.gcCbobPerBbl === null ? "no $/bbl" : `${formatMoney(marks.gcCbobPerBbl, 4)}/bbl`}
          stale={marks.gcCbobStale}
        />
        <Mark
          label="Chicago ethanol"
          primary={marks.ethanolCpg === null ? "—" : `${formatNumber(marks.ethanolCpg, 2)} cpg`}
          secondary={marks.ethanolPerBbl === null ? "no $/bbl" : `${formatMoney(marks.ethanolPerBbl, 4)}/bbl`}
          stale={marks.ethanolStale}
        />
        <Mark
          label="D6 RIN"
          primary={marks.d6Cts === null ? "—" : `${formatNumber(marks.d6Cts, 2)} cts/RIN`}
          secondary={
            marks.d6PerRin === null
              ? "not applied"
              : `${formatMoney(marks.d6PerRin, 4)}/RIN · RVO ${formatMoney(rvoDollarsPerBbl(marks.d6PerRin, plant.rvo.obligationRate), 3)}/bbl @ ${formatNumber(plant.rvo.obligationRate * 100, 1)}%`
          }
          stale={marks.d6Stale || Boolean(plant.rvo.d6Stale)}
        />
      </dl>
    </section>
  );
}

function Mark({
  label,
  primary,
  secondary,
  stale,
}: {
  label: string;
  primary: string;
  secondary: string;
  stale: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
        <Stale show={stale} />
      </dt>
      <dd className="font-mono text-sm tabular-nums">{primary}</dd>
      <p className="text-[11px] text-muted-foreground">{secondary}</p>
    </div>
  );
}
