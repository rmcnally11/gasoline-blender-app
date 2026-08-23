"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultPlant,
  optimizePlant,
  refreshTankSpecs,
  seekNaphtha,
  type Blendstock,
  type NaphthaSeekResult,
  type Plant,
  type PlantSolve,
  type ProductSpecs,
  type ProductTank,
  type SolverStatus,
  type TankId,
} from "@/lib/blend";

type BusyKind = "solve" | "seek" | null;

type PlantContextValue = {
  plant: Plant;
  solve: PlantSolve;
  solverStatus: SolverStatus;
  dirty: boolean;
  busy: BusyKind;
  lastAction: string | null;
  lightPrice: number;
  heavyPrice: number;
  lightResult: NaphthaSeekResult | null;
  heavyResult: NaphthaSeekResult | null;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  solvePlant: () => void;
  resetPlant: () => void;
  runSeek: () => void;
  setLightPrice: (price: number) => void;
  setHeavyPrice: (price: number) => void;
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
    message: "Press Solve plant to allocate the shared pool.",
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
  const [lightPrice, setLightPriceState] = useState(72);
  const [heavyPrice, setHeavyPriceState] = useState(68);
  const [lightResult, setLightResult] = useState<NaphthaSeekResult | null>(null);
  const [heavyResult, setHeavyResult] = useState<NaphthaSeekResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const plantRef = useRef(plant);
  const lightRef = useRef(lightPrice);
  const heavyRef = useRef(heavyPrice);
  plantRef.current = plant;
  lightRef.current = lightPrice;
  heavyRef.current = heavyPrice;

  const applySolve = useCallback((next: Plant, label: string) => {
    const result = optimizePlant(next);
    setPlant(next);
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
        setLightResult(seekNaphtha(current, "light", lightRef.current));
        setHeavyResult(seekNaphtha(current, "heavy", heavyRef.current));
        setLastAction("Goal-seek finished.");
      } finally {
        setBusy(null);
      }
    }, 20);
  }, []);

  useEffect(() => {
    solvePlant();
    window.setTimeout(() => {
      const current = plantRef.current;
      setLightResult(seekNaphtha(current, "light", lightRef.current));
      setHeavyResult(seekNaphtha(current, "heavy", heavyRef.current));
    }, 40);
  }, [solvePlant]);

  const resetPlant = useCallback(() => {
    const next = createDefaultPlant();
    applySolve(next, "Plant reset to defaults.");
    setLightPriceState(72);
    setHeavyPriceState(68);
    setLightResult(null);
    setHeavyResult(null);
  }, [applySolve]);

  const updateTank = useCallback((id: TankId, patch: Partial<ProductTank>) => {
    const current = plantRef.current;
    const next: Plant = {
      ...current,
      tanks: current.tanks.map((tank) => {
        if (tank.id !== id) return tank;
        return refreshTankSpecs({ ...tank, ...patch }, current.complianceOverlay);
      }),
    };
    applySolve(next, `${id} updated and re-solved.`);
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
    setPlant((current) => ({
      ...current,
      components: current.components.map((component) =>
        component.id === id ? { ...component, ...patch } : component,
      ),
    }));
    setSolverStatus("idle");
    setDirty(true);
    setLastAction("Pool edit waiting for Solve plant.");
  }, []);

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
      lightPrice,
      heavyPrice,
      lightResult,
      heavyResult,
      editingId,
      setEditingId,
      solvePlant,
      resetPlant,
      runSeek,
      setLightPrice: setLightPriceState,
      setHeavyPrice: setHeavyPriceState,
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
      lightPrice,
      heavyPrice,
      lightResult,
      heavyResult,
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
