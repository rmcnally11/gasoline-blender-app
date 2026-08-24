"use client";

import { AppShell } from "@/components/blender/app-shell";
import { UserManual } from "@/components/blender/user-manual";

export default function ManualPage() {
  return (
    <AppShell
      title="User manual"
      subtitle="Day 1 is six steps. Ignore the rest until those work."
      showEconomics={false}
    >
      <UserManual />
    </AppShell>
  );
}
