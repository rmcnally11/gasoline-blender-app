"use client";

import { AppShell } from "@/components/blender/app-shell";
import { PlantDesk } from "@/components/blender/plant-desk";

export default function HomePage() {
  return (
    <AppShell
      title="Plant"
      subtitle="Each region has its own blend pool and market values. Type reformate, alkylate, or isooctane in $/bbl or ¢/gal — the header re-solves."
    >
      <PlantDesk />
    </AppShell>
  );
}
