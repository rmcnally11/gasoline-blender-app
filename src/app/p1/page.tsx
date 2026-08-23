"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P1Page() {
  return (
    <AppShell
      title="P1 Regular"
      subtitle="This tank only. Grade, slate, season, ethanol, demand, recipe, and the full spec sheet. The pool is still shared with P2 and P3."
    >
      <TankPage tankId="P1" />
    </AppShell>
  );
}
