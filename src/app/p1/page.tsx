"use client";

import { AppShell } from "@/components/blender/app-shell";
import { TankPage } from "@/components/blender/tank-page";

export default function P1Page() {
  return (
    <AppShell
      title="P1"
      subtitle="Colonial destination. Set the CBOB marker and freight in $/gal, then value naphtha and blendstocks against that netback."
    >
      <TankPage tankId="P1" />
    </AppShell>
  );
}
