"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultPlant,
  defaultEthanolMode,
  freightPerGalFor,
  optimizePlant,
  perGalFromBbl,
  refreshTankSpecs,
  regionForSlate,
  regionLabel,
  seekRegion,
  type Blendstock,
  type ComponentSeekResult,
  type Plant,
  type PlantSolve,
  type ProductSpecs,
  type ProductTank,
  type RegionId,
  type SolverStatus,
  type TankId,
} from "@/lib/blend";
import {
  applyMarksAndBook,
  clearTypedForBookStreams,
  clearTypedForStream,
  defaultRackProduct,
  withTypedPrice,
} from "@/lib/marks/apply";
import { bookSourceOf, mergeComponentBook } from "@/lib/marks/component-book";
import { emptyDailyMarks } from "@/lib/marks/convert";
import { impliedValuesForUsed } from "@/lib/marks/implied";
import { persistBook, loadStoredBook } from "@/lib/marks/storage";
import type { ComponentBookRow, MarksApiPayload } from "@/lib/marks/types";

type SeekBook = Record<string, ComponentSeekResult>;

type BusyKind = "solve" | "seek" | "marks" | null;

type PlantContextValue = {
  plant: Plant;
  solve: PlantSolve;
  solverStatus: SolverStatus;
  dirty: boolean;
  busy: BusyKind;
  lastAction: string | null;
  activeRegion: RegionId;
  setActiveRegion: (regionId: RegionId) => void;
  seeks: SeekBook;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  solvePlant: () => void;
  resetPlant: () => void;
  runSeek: () => void;
  updateTank: (id: TankId, patch: Partial<ProductTank>) => void;
  updateTankSpecs: (id: TankId, patch: Partial<ProductSpecs>) => void;
  updateComponent: (id: string, patch: Partial<Blendstock>) => void;
  updateRvo: <K extends keyof Plant["rvo"]>(key: K, value: Plant["rvo"][K]) => void;
  updateComponentBook: (streamKey: ComponentBookRow["streamKey"], patch: Partial<ComponentBookRow>) => void;
  updateLiftEpsilon: (value: number) => void;
  refreshMarks: () => void;
  setOverlay: (enabled: boolean) => void;
  tankById: (id: TankId) => ProductTank | undefined;
  finishedBbl: number;
};

const PlantContext = createContext<PlantContextValue | null>(null);

function emptySolve(): PlantSolve {
  return {
    status: "idle",
    message: "Press Solve plant to allocate each regional book.",
    recipe: { barrels: { P1: {}, P2: {}, P3: {} } },
    tanks: (["P1", "P2", "P3"] as const).map((tankId) => ({
      tankId,
      recipe: { volumes: {} },
      barrels: {},
      properties: null,
      cleanBatch: true,
      mixedFails: false,
      failReasons: [],
      lpRvpLimit: 9,
      rvpClassPsi: 9,
      waiverApplied: false,
      bonsUsed: [],
    })),
    componentUsedBbl: {},
    blendCost: null,
    revenue: null,
    rvoCost: null,
    rvoObligation: null,
    rvoCredit: null,
    rvoObligationPerBbl: null,
    rvoCreditPerBbl: null,
    rvoNetPerBbl: null,
    freightCost: null,
    margin: null,
    impliedValues: {},
    bindingConstraints: [],
    relaxOptions: [],
    cheapestRelax: null,
  };
}

function marksLabel(result: MarksApiPayload): string {
  const marksBit = result.ok
    ? result.marks.date
      ? `Marks as of ${result.marks.date} applied.`
      : "Platts Daily row applied. Some fields are stale / missing."
    : result.message;
  if (!result.book?.ok) {
    return `${marksBit} Component Book fetch failed — ${result.book?.message ?? "no book payload."}`;
  }
  return marksBit;
}

function payloadFromFetchError(error: unknown): MarksApiPayload {
  const message = error instanceof Error ? error.message : "Marks fetch failed.";
  return {
    ok: false,
    reason: "airtable_error",
    message,
    priorMarks: null,
    book: { ok: false, reason: "airtable_error", message: `Component Book fetch failed. ${message}` },
  };
}

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [plant, setPlant] = useState<Plant>(() => createDefaultPlant());
  const [solve, setSolve] = useState<PlantSolve>(emptySolve);
  const [solverStatus, setSolverStatus] = useState<SolverStatus>("idle");
  const [dirty, setDirty] = useState(true);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<RegionId>("colonial");
  const [seekBooks, setSeekBooks] = useState<Partial<Record<RegionId, SeekBook>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const plantRef = useRef(plant);
  const regionRef = useRef(activeRegion);
  const solveRef = useRef(solve);
  const solveGen = useRef(0);
  plantRef.current = plant;
  regionRef.current = activeRegion;
  solveRef.current = solve;

  const seeks = seekBooks[activeRegion] ?? {};

  const applySolve = useCallback((next: Plant, label: string) => {
    const result = optimizePlant(next);
    const gen = ++solveGen.current;
    setPlant(next);
    plantRef.current = next;
    setSolve(result);
    setSolverStatus(result.status);
    setDirty(false);
    setLastAction(label);
    if (result.status === "optimal") {
      window.setTimeout(() => {
        if (gen !== solveGen.current) return;
        const implied = impliedValuesForUsed(next, result.componentUsedBbl);
        if (gen !== solveGen.current) return;
        setSolve((prev) => ({ ...prev, impliedValues: implied }));
      }, 0);
    }
    return result;
  }, []);

  const solvePlant = useCallback(() => {
    setBusy("solve");
    window.setTimeout(() => {
      try {
        applySolve(applyMarksAndBook(plantRef.current), "Plant solved.");
      } finally {
        setBusy(null);
      }
    }, 20);
  }, [applySolve]);

  const runSeek = useCallback(() => {
    setBusy("seek");
    window.setTimeout(() => {
      try {
        const current = plantRef.current;
        const region = regionRef.current;
        const book = Object.fromEntries(
          seekRegion(current, region).map((item) => [item.componentId, item]),
        );
        setSeekBooks((prev) => ({ ...prev, [region]: book }));
        setLastAction(`Valued ${regionLabel(region)} components versus the destination.`);
      } finally {
        setBusy(null);
      }
    }, 20);
  }, []);

  const repriceFrozen = useCallback((next: Plant, label: string) => {
    setPlant(next);
    plantRef.current = next;
    setLastAction(label);
    const frozen = solveRef.current;
    if (frozen.status !== "optimal") return;
    const gen = ++solveGen.current;
    window.setTimeout(() => {
      if (gen !== solveGen.current) return;
      const implied = impliedValuesForUsed(next, frozen.componentUsedBbl);
      if (gen !== solveGen.current) return;
      setSolve((prev) => ({ ...prev, impliedValues: implied }));
    }, 0);
  }, []);

  const applyPrices = useCallback(
    (next: Plant, label: string) => {
      if (solveRef.current.status === "optimal") {
        repriceFrozen(next, label);
        return;
      }
      applySolve(next, label);
    },
    [applySolve, repriceFrozen],
  );

  const applyFetchedMarks = useCallback((current: Plant, result: MarksApiPayload): Plant => {
    let next: Plant = {
      ...current,
      priorMarks: result.priorMarks ?? null,
    };

    if (result.ok) {
      next = {
        ...next,
        marks: result.marks,
        marksLoadState: "ok",
        marksLoadError: null,
      };
    } else {
      next = {
        ...next,
        marks: emptyDailyMarks(),
        marksLoadState: result.reason === "missing_token" ? "missing_token" : "error",
        marksLoadError: result.message,
      };
    }

    const book = result.book ?? {
      ok: false as const,
      reason: "airtable_error" as const,
      message: "Component Book was not returned. Dummy assay prices are not the Airtable book.",
    };

    if (book.ok) {
      const componentBook = mergeComponentBook(book.rows);
      persistBook(componentBook, current.liftEpsilonPerBbl);
      next = {
        ...next,
        componentBook,
        components: clearTypedForBookStreams(next.components),
        bookLoadState: "ok",
        bookLoadError: null,
      };
    } else {
      next = {
        ...next,
        bookLoadState: book.reason === "missing_token" ? "missing_token" : "error",
        bookLoadError: book.message,
      };
    }

    return applyMarksAndBook(next);
  }, []);

  const refreshMarks = useCallback(() => {
    setBusy("marks");
    setPlant((current) => {
      const next = { ...current, marksLoadState: "loading" as const, bookLoadState: "loading" as const };
      plantRef.current = next;
      return next;
    });
    void fetch("/api/marks")
      .then(async (response) => (await response.json()) as MarksApiPayload)
      .then((result) => {
        const next = applyFetchedMarks(plantRef.current, result);
        applyPrices(next, marksLabel(result));
      })
      .catch((error: unknown) => {
        const payload = payloadFromFetchError(error);
        const next = applyFetchedMarks(plantRef.current, payload);
        applyPrices(next, marksLabel(payload));
      })
      .finally(() => setBusy(null));
  }, [applyFetchedMarks, applyPrices]);

  useEffect(() => {
    const stored = loadStoredBook();
    if (stored) {
      const seeded = applyMarksAndBook({
        ...plantRef.current,
        componentBook: stored.book,
        liftEpsilonPerBbl: stored.liftEpsilonPerBbl,
      });
      plantRef.current = seeded;
      setPlant(seeded);
    }
    refreshMarks();
  }, [refreshMarks]);

  const resetPlant = useCallback(() => {
    const current = plantRef.current;
    const next = applyMarksAndBook({
      ...createDefaultPlant(),
      componentBook: current.componentBook,
      liftEpsilonPerBbl: current.liftEpsilonPerBbl,
      marks: current.marks,
      priorMarks: current.priorMarks,
      marksLoadState: current.marksLoadState,
      marksLoadError: current.marksLoadError,
      bookLoadState: current.bookLoadState,
      bookLoadError: current.bookLoadError,
    });
    applySolve(next, "Plant reset. Marks and component book kept.");
    setSeekBooks({});
    setActiveRegion("colonial");
  }, [applySolve]);

  const updateTank = useCallback(
    (id: TankId, patch: Partial<ProductTank>) => {
      const current = plantRef.current;
      const nextTanks = current.tanks.map((tank) => {
        if (tank.id !== id) return tank;
        const nextTank = { ...tank, ...patch };
        if (patch.slateId && patch.ethanolMode === undefined) {
          nextTank.ethanolMode = defaultEthanolMode(patch.slateId);
        }
        if (patch.slateId && patch.freightPerGal === undefined) {
          nextTank.freightPerGal = freightPerGalFor(patch.slateId);
        }
        if (patch.rackPricePerBbl !== undefined && patch.rackProduct === undefined) {
          nextTank.rackProduct = "manual";
          nextTank.rackStale = false;
          nextTank.rackMarksLabel = "typed";
        }
        if ((patch.slateId || patch.gradeId) && patch.rackProduct === undefined && nextTank.rackProduct !== "manual") {
          nextTank.rackProduct = defaultRackProduct(nextTank.gradeId, nextTank.slateId);
        }
        const resetWaiver = Boolean(patch.slateId || patch.seasonId || patch.ethanolMode);
        return refreshTankSpecs(nextTank, current.complianceOverlay, { resetWaiver });
      });
      const next = applyMarksAndBook({ ...current, tanks: nextTanks });
      applySolve(next, `${id} updated and re-solved.`);
      if (patch.slateId) setActiveRegion(regionForSlate(patch.slateId));
    },
    [applySolve],
  );

  const updateTankSpecs = useCallback((id: TankId, patch: Partial<ProductSpecs>) => {
    setPlant((current) => ({
      ...current,
      tanks: current.tanks.map((tank) => {
        if (tank.id !== id) return tank;
        const specs = { ...tank.specs, ...patch };
        return current.complianceOverlay
          ? { ...tank, specs, finishedSpecs: { ...tank.finishedSpecs, ...patch } }
          : { ...tank, specs, pipeSpecs: { ...tank.pipeSpecs, ...patch } };
      }),
    }));
    setSolverStatus("idle");
    setDirty(true);
    setLastAction("Spec edit waiting for Solve plant.");
  }, []);

  const updateComponent = useCallback(
    (id: string, patch: Partial<Blendstock>) => {
      const keys = Object.keys(patch);
      const current = plantRef.current;
      const next: Plant = {
        ...current,
        components: current.components.map((component) => {
          if (component.id !== id) return component;
          if (patch.costPerBbl !== undefined && patch.priceOrigin === undefined) {
            return withTypedPrice({ ...component, ...patch }, patch.costPerBbl);
          }
          return { ...component, ...patch };
        }),
      };
      const name = current.components.find((component) => component.id === id)?.name ?? "Stream";
      if (keys.length === 1 && keys[0] === "costPerBbl" && patch.costPerBbl !== undefined) {
        applySolve(next, `${name} market set to $${perGalFromBbl(patch.costPerBbl).toFixed(4)}/gal.`);
        return;
      }
      if (keys.length === 1 && keys[0] === "minLiftBbl" && patch.minLiftBbl !== undefined) {
        applySolve(next, `${name} must-use set to ${patch.minLiftBbl.toFixed(0)} bbl.`);
        return;
      }
      setPlant(next);
      plantRef.current = next;
      setSolverStatus("idle");
      setDirty(true);
      setLastAction("Pool edit waiting for Solve plant.");
    },
    [applySolve],
  );

  const updateRvo = useCallback(
    <K extends keyof Plant["rvo"]>(key: K, value: Plant["rvo"][K]) => {
      const current = plantRef.current;
      const rvo = { ...current.rvo, [key]: value };
      if (key === "d6RinPrice") {
        rvo.d6Stale = false;
      }
      applySolve({ ...current, rvo }, "RVO updated and re-solved.");
    },
    [applySolve],
  );

  const updateComponentBook = useCallback(
    (streamKey: ComponentBookRow["streamKey"], patch: Partial<ComponentBookRow>) => {
      const current = plantRef.current;
      const componentBook = current.componentBook.map((row) => {
        if (row.streamKey !== streamKey) return row;
        const merged = { ...row, ...patch };
        if (patch.basisCpg !== undefined || patch.overridePerBbl !== undefined) {
          merged.source = bookSourceOf({ ...merged, source: "typed" });
        }
        return merged;
      });
      persistBook(componentBook, current.liftEpsilonPerBbl);
      const priceTouched = patch.basisCpg !== undefined || patch.overridePerBbl !== undefined;
      if (!priceTouched) {
        const next = { ...current, componentBook };
        plantRef.current = next;
        setPlant(next);
        return;
      }
      const components = clearTypedForStream(current.components, streamKey);
      const next = applyMarksAndBook({ ...current, componentBook, components });
      applyPrices(next, `${streamKey} book updated on the frozen recipe.`);
    },
    [applyPrices],
  );

  const updateLiftEpsilon = useCallback((value: number) => {
    setPlant((current) => {
      const next = { ...current, liftEpsilonPerBbl: value };
      persistBook(next.componentBook, value);
      plantRef.current = next;
      return next;
    });
    setLastAction(`Lift epsilon set to $${value.toFixed(2)}/bbl.`);
  }, []);

  const setOverlay = useCallback(
    (complianceOverlay: boolean) => {
      const current = plantRef.current;
      const next: Plant = {
        ...current,
        complianceOverlay,
        tanks: current.tanks.map((tank) => refreshTankSpecs(tank, complianceOverlay)),
      };
      applySolve(next, "Overlay updated and re-solved.");
    },
    [applySolve],
  );

  const finishedBbl = useMemo(
    () => plant.tanks.filter((tank) => tank.enabled).reduce((sum, tank) => sum + tank.demandBbl, 0),
    [plant.tanks],
  );

  const value = useMemo<PlantContextValue>(
    () => ({
      plant,
      solve,
      solverStatus,
      dirty,
      busy,
      lastAction,
      activeRegion,
      setActiveRegion,
      seeks,
      editingId,
      setEditingId,
      solvePlant,
      resetPlant,
      runSeek,
      updateTank,
      updateTankSpecs,
      updateComponent,
      updateRvo,
      updateComponentBook,
      updateLiftEpsilon,
      refreshMarks,
      setOverlay,
      tankById: (id) => plant.tanks.find((tank) => tank.id === id),
      finishedBbl,
    }),
    [
      plant,
      solve,
      solverStatus,
      dirty,
      busy,
      lastAction,
      activeRegion,
      seeks,
      editingId,
      solvePlant,
      resetPlant,
      runSeek,
      updateTank,
      updateTankSpecs,
      updateComponent,
      updateRvo,
      updateComponentBook,
      updateLiftEpsilon,
      refreshMarks,
      setOverlay,
      finishedBbl,
    ],
  );

  return <PlantContext.Provider value={value}>{children}</PlantContext.Provider>;
}

export function usePlant(): PlantContextValue {
  const value = useContext(PlantContext);
  if (!value) throw new Error("usePlant must be used inside PlantProvider");
  return value;
}
