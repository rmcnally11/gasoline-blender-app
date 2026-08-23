"use client";

import { AppShell } from "@/components/blender/app-shell";
import { PlantDesk } from "@/components/blender/plant-desk";

export default function HomePage() {
  return (
    <AppShell
      title="Plant"
      subtitle="Shared pool, naphtha goal-seek, and plant economics in dollars per finished gallon. Open P1, P2, or P3 for a single blend."
    >
      <PlantDesk />
    </AppShell>
  );
}
