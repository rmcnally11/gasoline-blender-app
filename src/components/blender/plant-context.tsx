"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultPlant,
  defaultEthanolMode,
  optimizePlant,
  refreshTankSpecs,
  regionForSlate,
  regionLabel,
  seekNaphtha,
  type Blendstock,
  type NaphthaSeekResult,
  type Plant,
  type PlantSolve,
  type ProductSpecs,
  type ProductTank,
  type RegionId,
  type SolverStatus,
  type TankId,
} from "@/lib/blend";

type RegionPrices = Record<RegionId, { light: number; heavy: number }>;
type RegionSeeks = Record<RegionId, { light: NaphthaSeekResult | null; heavy: NaphthaSeekResult | null }>;

const DEFAULT_PRICES: RegionPrices = {
  colonial: { light: 72, heavy: 68 },
  explorer: { light: 70, heavy: 66 },
  "west-coast": { light: 78, heavy: 74 },
  mexico: { light: 64, heavy: 60 },
};

function emptySeeks(): RegionSeeks {
  return {
    colonial: { light: null, heavy: null },
    explorer: { light: null, heavy: null },
    "west-coast": { light: null, heavy: null },
    mexico: { light: null, heavy: null },
  };
}

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
    message: "Press Solve plant to allocate each regional pool.",
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
  const [activeRegion, setActiveRegion] = useState<RegionId>("colonial");
  const [regionPrices, setRegionPrices] = useState<RegionPrices>(DEFAULT_PRICES);
  const [regionSeeks, setRegionSeeks] = useState<RegionSeeks>(emptySeeks);
  const [editingId, setEditingId] = useState<string | null>(null);

  const plantRef = useRef(plant);
  const pricesRef = useRef(regionPrices);
  const regionRef = useRef(activeRegion);
  plantRef.current = plant;
  pricesRef.current = regionPrices;
  regionRef.current = activeRegion;

  const lightPrice = regionPrices[activeRegion].light;
  const heavyPrice = regionPrices[activeRegion].heavy;
  const lightResult = regionSeeks[activeRegion].light;
  const heavyResult = regionSeeks[activeRegion].heavy;

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
        const region = regionRef.current;
        const prices = pricesRef.current[region];
        setRegionSeeks((prev) => ({
          ...prev,
          [region]: {
            light: seekNaphtha(current, region, "light", prices.light),
            heavy: seekNaphtha(current, region, "heavy", prices.heavy),
          },
        }));
        setLastAction(`Goal-seek finished for ${regionLabel(region)}.`);
      } finally {
        setBusy(null);
      }
    }, 20);
  }, []);

  useEffect(() => {
    solvePlant();
    window.setTimeout(() => {
      const current = plantRef.current;
      const prices = pricesRef.current;
      setRegionSeeks({
        colonial: {
          light: seekNaphtha(current, "colonial", "light", prices.colonial.light),
          heavy: seekNaphtha(current, "colonial", "heavy", prices.colonial.heavy),
        },
        explorer: {
          light: seekNaphtha(current, "explorer", "light", prices.explorer.light),
          heavy: seekNaphtha(current, "explorer", "heavy", prices.explorer.heavy),
        },
        "west-coast": {
          light: seekNaphtha(current, "west-coast", "light", prices["west-coast"].light),
          heavy: seekNaphtha(current, "west-coast", "heavy", prices["west-coast"].heavy),
        },
        mexico: {
          light: seekNaphtha(current, "mexico", "light", prices.mexico.light),
          heavy: seekNaphtha(current, "mexico", "heavy", prices.mexico.heavy),
        },
      });
    }, 40);
  }, [solvePlant]);

  const resetPlant = useCallback(() => {
    const next = createDefaultPlant();
    applySolve(next, "Plant reset to defaults.");
    setRegionPrices(DEFAULT_PRICES);
    setRegionSeeks(emptySeeks());
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
        return refreshTankSpecs(nextTank, current.complianceOverlay);
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
    if (keys.length === 1 && keys[0] === "costPerBbl" && patch.costPerBbl !== undefined) {
      const name = current.components.find((component) => component.id === id)?.name ?? "Stream";
      applySolve(next, `${name} market set to $${patch.costPerBbl.toFixed(2)}/bbl.`);
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
      lightPrice,
      heavyPrice,
      lightResult,
      heavyResult,
      editingId,
      setEditingId,
      solvePlant,
      resetPlant,
      runSeek,
      setLightPrice: (price: number) => {
        setRegionPrices((current) => ({
          ...current,
          [activeRegion]: { ...current[activeRegion], light: price },
        }));
      },
      setHeavyPrice: (price: number) => {
        setRegionPrices((current) => ({
          ...current,
          [activeRegion]: { ...current[activeRegion], heavy: price },
        }));
      },
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
