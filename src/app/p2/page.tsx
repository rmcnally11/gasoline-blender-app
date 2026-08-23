"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P2Page() {
  return (
    <AppShell
      title="P2"
      subtitle="Finished-product tank. Changes here re-solve the whole plant because P1 and P3 draw from the same barrels."
    >
      <TankPage tankId="P2" />
    </AppShell>
  );
}
