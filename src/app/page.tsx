"use client";

import { AppShell } from "@/components/blender/app-shell";
import { PlantDesk } from "@/components/blender/plant-desk";

export default function HomePage() {
  return (
    <AppShell
      title="Plant"
      subtitle="Each region has its own blend pool. Colonial, Explorer, West Coast, and Mexico do not share barrels. Economics are dollars per finished gallon."
    >
      <PlantDesk />
    </AppShell>
  );
}
