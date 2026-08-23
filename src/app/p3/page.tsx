"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P3Page() {
  return (
    <AppShell
      title="P3 Premium"
      subtitle="This tank only. Premium usually pulls alkylate. Check binding octane, benzene, and DI after you solve."
    >
      <TankPage tankId="P3" />
    </AppShell>
  );
}
