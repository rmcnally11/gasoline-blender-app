"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P2Page() {
  return (
    <AppShell
      title="P2"
      subtitle="Finished-product tank. Defaults to Explorer, so it has its own Midwest pool. Switching the slate moves this tank onto another region's barrels."
    >
      <TankPage tankId="P2" />
    </AppShell>
  );
}
