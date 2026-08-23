"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BlendResult,
  Component,
  GradeSpec,
  Season,
  SpecEvaluation,
} from "@/lib/blend";

const DEFAULT_VOLUMES: Record<string, number> = {
  reformate: 420,
  alkylate: 150,
  fcc: 260,
  lsr: 40,
  butane: 15,
  ethanol: 90,
};

interface BlendResponse {
  grade: GradeSpec;
  season: Season;
  result: BlendResult;
  evaluation: SpecEvaluation;
}

interface DefaultsResponse {
  components: Component[];
  grades: GradeSpec[];
}

export default function Home() {
  const [components, setComponents] = useState<Component[]>([]);
  const [grades, setGrades] = useState<GradeSpec[]>([]);
  const [volumes, setVolumes] = useState<Record<string, number>>(DEFAULT_VOLUMES);
  const [gradeId, setGradeId] = useState("regular");
  const [season, setSeason] = useState<Season>("summer");
  const [blend, setBlend] = useState<BlendResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/blend")
      .then((res) => res.json())
      .then((data: DefaultsResponse) => {
        setComponents(data.components);
        setGrades(data.grades);
      })
      .catch(() => setLoadError("Could not load the blendstock library."));
  }, []);

  const compute = useCallback(async () => {
    try {
      const res = await fetch("/api/blend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumes, gradeId, season }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setBlend((await res.json()) as BlendResponse);
      setLoadError(null);
    } catch {
      setLoadError("Blend calculation failed.");
    }
  }, [volumes, gradeId, season]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(compute, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [compute]);

  const setVolume = (id: string, value: string) => {
    const parsed = Number(value);
    setVolumes((prev) => ({ ...prev, [id]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const totalVolume = useMemo(
    () => Object.values(volumes).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [volumes]
  );

  const result = blend?.result;
  const evaluation = blend?.evaluation;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-black/10 pb-5 dark:border-white/15 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Refinery Operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Gasoline Blend Header</h1>
          <p className="mt-1 max-w-xl text-sm text-black/60 dark:text-white/60">
            Combine blendstocks, then check octane, vapor pressure, ethanol, and
            cost against grade spec. Calculations run server-side.
          </p>
        </div>
        <div className="flex gap-3">
          <label className="flex flex-col text-xs font-medium text-black/60 dark:text-white/60">
            Target grade
            <select
              value={gradeId}
              onChange={(e) => setGradeId(e.target.value)}
              className="mt-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black dark:border-white/20 dark:bg-neutral-900 dark:text-white"
            >
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-black/60 dark:text-white/60">
            Season
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value as Season)}
              className="mt-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black dark:border-white/20 dark:bg-neutral-900 dark:text-white"
            >
              <option value="summer">Summer</option>
              <option value="winter">Winter</option>
            </select>
          </label>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Blendstocks</h2>
            <span className="text-sm text-black/60 dark:text-white/60">
              Total: <span className="font-mono font-semibold">{totalVolume.toLocaleString()}</span> bbl
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  <th className="py-2 pr-3 font-medium">Component</th>
                  <th className="py-2 px-2 font-medium">RON</th>
                  <th className="py-2 px-2 font-medium">MON</th>
                  <th className="py-2 px-2 font-medium">RVP</th>
                  <th className="py-2 px-2 font-medium">$/L</th>
                  <th className="py-2 pl-2 text-right font-medium">Volume (bbl)</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c) => (
                  <tr key={c.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    <td className="py-2 px-2 font-mono text-black/70 dark:text-white/70">{c.ron}</td>
                    <td className="py-2 px-2 font-mono text-black/70 dark:text-white/70">{c.mon}</td>
                    <td className="py-2 px-2 font-mono text-black/70 dark:text-white/70">{c.rvp}</td>
                    <td className="py-2 px-2 font-mono text-black/70 dark:text-white/70">{c.costPerL.toFixed(2)}</td>
                    <td className="py-2 pl-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={5}
                        aria-label={`${c.name} volume`}
                        value={volumes[c.id] ?? 0}
                        onChange={(e) => setVolume(c.id, e.target.value)}
                        className="w-24 rounded-md border border-black/15 bg-white px-2 py-1 text-right font-mono text-black focus:border-amber-500 focus:outline-none dark:border-white/20 dark:bg-neutral-900 dark:text-white"
                      />
                    </td>
                  </tr>
                ))}
                {components.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-black/50 dark:text-white/50">
                      Loading blendstocks…
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div
            className={`rounded-xl border p-4 ${
              evaluation?.onSpec
                ? "border-green-400/50 bg-green-50 dark:border-green-500/40 dark:bg-green-950/30"
                : "border-red-400/50 bg-red-50 dark:border-red-500/40 dark:bg-red-950/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-black/70 dark:text-white/70">
                {blend?.grade.name} · {season}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  evaluation?.onSpec
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {evaluation?.onSpec ? "On-Spec" : "Off-Spec"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric label="AKI" value={result?.aki} />
              <Metric label="RVP (psi)" value={result?.rvp} />
              <Metric label="$/L" value={result?.costPerL} digits={3} />
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-lg font-semibold">Spec checks</h2>
            <ul className="flex flex-col gap-2">
              {evaluation?.checks.map((check) => (
                <li
                  key={check.label}
                  className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2 text-sm dark:border-white/10"
                >
                  <span>{check.label}</span>
                  <span className="flex items-center gap-2 font-mono">
                    <span>
                      {check.value} / {check.direction === "min" ? "≥" : "≤"} {check.limit} {check.unit}
                    </span>
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        check.pass ? "bg-green-500" : "bg-red-500"
                      }`}
                      aria-label={check.pass ? "pass" : "fail"}
                    />
                  </span>
                </li>
              ))}
              {!evaluation ? (
                <li className="text-sm text-black/50 dark:text-white/50">Awaiting calculation…</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-2 text-lg font-semibold">Blend summary</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              <Detail label="RON" value={result?.ron} />
              <Detail label="MON" value={result?.mon} />
              <Detail label="Density (kg/L)" value={result?.density} digits={3} />
              <Detail label="Ethanol (vol%)" value={result?.ethanolPct} />
              <Detail label="Total volume (bbl)" value={result?.totalVolume} />
              <Detail label="Total cost ($)" value={result?.totalCost} />
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, digits = 2 }: { label: string; value?: number; digits?: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{label}</p>
      <p className="font-mono text-2xl font-bold tabular-nums">
        {value === undefined ? "—" : value.toFixed(digits)}
      </p>
    </div>
  );
}

function Detail({ label, value, digits = 2 }: { label: string; value?: number; digits?: number }) {
  return (
    <>
      <dt className="text-black/60 dark:text-white/60">{label}</dt>
      <dd className="text-right font-mono tabular-nums">
        {value === undefined ? "—" : value.toFixed(digits)}
      </dd>
    </>
  );
}
