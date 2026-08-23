"use client";

import { AppShell } from "@/components/blender/app-shell";
import { PlantDesk } from "@/components/blender/plant-desk";

export default function HomePage() {
  return (
    <AppShell
      title="Plant"
      subtitle="Price components in $/gal against a fungible or export destination. Lock naphtha you own, then value what else you can buy to blend and ship."
    >
      <PlantDesk />
    </AppShell>
  );
}
