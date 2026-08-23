"use client";

import { AppShell } from "@/components/blender/app-shell";
import { PlantDesk } from "@/components/blender/plant-desk";

export default function HomePage() {
  return (
    <AppShell
      title="Plant"
      subtitle="Buy components and blend heel + new barrels to a published spec. Pipe receipt and finished are separate. Type your book."
    >
      <PlantDesk />
    </AppShell>
  );
}
