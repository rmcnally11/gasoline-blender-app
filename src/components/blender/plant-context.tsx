"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultPlant,
  defaultEthanolMode,
  freightPerGalFor,
  optimizePlant,
  rackPricePerBbl,
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

type SeekBook = Record<string, ComponentSeekResult>;

type BusyKind = "solve" | "seek" | null;

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
    tanks: [
      { tankId: "P1", recipe: { volumes: {} }, barrels: {}, properties: null },
      { tankId: "P2", recipe: { volumes: {} }, barrels: {}, properties: null },
      { tankId: "P3", recipe: { volumes: {} }, barrels: {}, properties: null },
    ],
    componentUsedBbl: {},
    blendCost: null,
    revenue: null,
    rvoCost: null,
    freightCost: null,
    margin: null,
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
  plantRef.current = plant;
  regionRef.current = activeRegion;

  const seeks = seekBooks[activeRegion] ?? {};

  const applySolve = useCallback((next: Plant, label: string) => {
    const result = optimizePlant(next);
    setPlant(next);
    plantRef.current = next;
    setSolve(result);
    setSolverStatus(result.status);
    setDirty(false);
    setLastAction(label);
    return result;
  }, []);

  const solvePlant = useCallback(() => {
    setBusy("solve");
    window.setTimeout(() => {
      try {
        applySolve(plantRef.current, "Plant solved.");
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

  useEffect(() => {
    solvePlant();
    window.setTimeout(() => {
      const current = plantRef.current;
      const book = Object.fromEntries(
        seekRegion(current, "colonial").map((item) => [item.componentId, item]),
      );
      setSeekBooks((prev) => ({ ...prev, colonial: book }));
    }, 40);
  }, [solvePlant]);

  const resetPlant = useCallback(() => {
    const next = createDefaultPlant();
    applySolve(next, "Plant reset to defaults.");
    setSeekBooks({});
    setActiveRegion("colonial");
  }, [applySolve]);

  const updateTank = useCallback((id: TankId, patch: Partial<ProductTank>) => {
    const current = plantRef.current;
    const next: Plant = {
      ...current,
      tanks: current.tanks.map((tank) => {
        if (tank.id !== id) return tank;
        const nextTank = { ...tank, ...patch };
        if (patch.slateId && patch.ethanolMode === undefined) {
          nextTank.ethanolMode = defaultEthanolMode(patch.slateId);
        }
        if (patch.slateId && patch.freightPerGal === undefined) {
          nextTank.freightPerGal = freightPerGalFor(patch.slateId);
        }
        const refreshed = refreshTankSpecs(nextTank, current.complianceOverlay);
        if ((patch.slateId || patch.gradeId) && patch.rackPricePerBbl === undefined) {
          refreshed.rackPricePerBbl = rackPricePerBbl(refreshed.gradeId, refreshed.slateId);
        }
        return refreshed;
      }),
    };
    applySolve(next, `${id} updated and re-solved.`);
    if (patch.slateId) setActiveRegion(regionForSlate(patch.slateId));
  }, [applySolve]);

  const updateTankSpecs = useCallback((id: TankId, patch: Partial<ProductSpecs>) => {
    setPlant((current) => ({
      ...current,
      tanks: current.tanks.map((tank) =>
        tank.id === id ? { ...tank, specs: { ...tank.specs, ...patch } } : tank,
      ),
    }));
    setSolverStatus("idle");
    setDirty(true);
    setLastAction("Spec edit waiting for Solve plant.");
  }, []);

  const updateComponent = useCallback((id: string, patch: Partial<Blendstock>) => {
    const keys = Object.keys(patch);
    const current = plantRef.current;
    const next: Plant = {
      ...current,
      components: current.components.map((component) =>
        component.id === id ? { ...component, ...patch } : component,
      ),
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
  }, [applySolve]);

  const updateRvo = useCallback(<K extends keyof Plant["rvo"]>(key: K, value: Plant["rvo"][K]) => {
    const current = plantRef.current;
    applySolve({ ...current, rvo: { ...current.rvo, [key]: value } }, "RVO updated and re-solved.");
  }, [applySolve]);

  const setOverlay = useCallback((complianceOverlay: boolean) => {
    const current = plantRef.current;
    const next: Plant = {
      ...current,
      complianceOverlay,
      tanks: current.tanks.map((tank) => refreshTankSpecs(tank, complianceOverlay)),
    };
    applySolve(next, "Overlay updated and re-solved.");
  }, [applySolve]);

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
