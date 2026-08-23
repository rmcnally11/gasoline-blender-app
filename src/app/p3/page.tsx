"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P3Page() {
  return (
    <AppShell
      title="P3"
      subtitle="Finished-product tank. Starts on Colonial with P1. Change the slate if this tank should draw Explorer, West Coast, or Mexico barrels instead."
    >
      <TankPage tankId="P3" />
    </AppShell>
  );
}
