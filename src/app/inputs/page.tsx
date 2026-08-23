"use client";

import { AppShell } from "@/components/blender/app-shell";
import { InputsDesk } from "@/components/blender/inputs-desk";

export default function InputsPage() {
  return (
    <AppShell
      title="Inputs"
      subtitle="Master book. Airtable Component Book lands on Rules. Type use, inventory, must-use, market $/gal, and a local override here. Plant and the tanks read these numbers — they do not keep a second book."
      showEconomics={false}
    >
      <InputsDesk />
    </AppShell>
  );
}
