"use client";

import { AppShell } from "@/components/blender/app-shell";
import { UserManual } from "@/components/blender/user-manual";

export default function ManualPage() {
  return (
    <AppShell
      title="User manual"
      subtitle="What every field is. Hover a dotted term on this page or on Inputs / Plant / the tanks."
      showEconomics={false}
    >
      <UserManual />
    </AppShell>
  );
}
