"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P1Page() {
  return (
    <AppShell
      title="P1"
      subtitle="Colonial lift. Pipe CBOB receipt unless you turn the finished overlay on. Heel is in the mix."
    >
      <TankPage tankId="P1" />
    </AppShell>
  );
}
