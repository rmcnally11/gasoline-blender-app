"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P2Page() {
  return (
    <AppShell
      title="P2"
      subtitle="Explorer destination by default. Marker and freight are $/gal. Switching the slate moves this lift onto another market’s barrels."
    >
      <TankPage tankId="P2" />
    </AppShell>
  );
}
