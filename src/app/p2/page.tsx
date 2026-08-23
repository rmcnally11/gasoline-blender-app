"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P2Page() {
  return (
    <AppShell
      title="P2"
      subtitle="Explorer lift. Pipe CBOB receipt unless you turn the finished overlay on. Heel is in the mix."
    >
      <TankPage tankId="P2" />
    </AppShell>
  );
}
