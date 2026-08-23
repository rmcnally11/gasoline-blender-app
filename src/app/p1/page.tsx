"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P1Page() {
  return (
    <AppShell
      title="P1"
      subtitle="Finished-product tank. Spec slate picks both the quality limits and the regional blend pool. P3 shares Colonial barrels with this tank; P2 does not."
    >
      <TankPage tankId="P1" />
    </AppShell>
  );
}
