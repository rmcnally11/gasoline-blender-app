"use client";

import { AppShell } from "@/components/blender/app-shell";
import { PlantDesk } from "@/components/blender/plant-desk";

export default function HomePage() {
  return (
    <AppShell
      title="Plant"
      subtitle="P&L after Solve. Type the component book on Inputs. P1 / P2 / P3 are the tickets."
    >
      <PlantDesk />
    </AppShell>
  );
}
