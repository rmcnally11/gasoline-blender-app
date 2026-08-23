"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P3Page() {
  return (
    <AppShell
      title="P3"
      subtitle="Starts on Colonial with P1. Change the slate to price a different pipeline or export lift."
    >
      <TankPage tankId="P3" />
    </AppShell>
  );
}
