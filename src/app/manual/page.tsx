"use client";

import { AppShell } from "@/components/blender/app-shell";
import { UserManual } from "@/components/blender/user-manual";

export default function ManualPage() {
  return (
    <AppShell
      title="User manual"
      subtitle="How to run a case, read $/gal, solve the header, and goal-seek naphtha."
      showEconomics={false}
    >
      <UserManual />
    </AppShell>
  );
}
