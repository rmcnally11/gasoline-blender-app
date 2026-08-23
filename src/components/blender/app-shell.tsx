"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssayDialog } from "./assay-dialog";
import { ActionButton } from "./action-button";
import { EconomicsStrip } from "./economics-strip";
import { usePlant } from "./plant-context";
import { AlertTriangle } from "lucide-react";

const NAV = [
  { href: "/", label: "Plant" },
  { href: "/p1", label: "P1" },
  { href: "/p2", label: "P2" },
  { href: "/p3", label: "P3" },
  { href: "/manual", label: "User manual" },
];

export function AppShell({
  title,
  subtitle,
  children,
  showEconomics = true,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  showEconomics?: boolean;
}) {
  const pathname = usePathname();
  const {
    plant,
    solve,
    solverStatus,
    dirty,
    busy,
    lastAction,
    editingId,
    setEditingId,
    solvePlant,
    resetPlant,
    updateComponent,
  } = usePlant();
  const editing = plant.components.find((component) => component.id === editingId) ?? null;
  const onManual = pathname === "/manual";

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_46%)]">
      <header className="border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-[0.18em] text-amber-800 uppercase">
              Blend header
            </p>
            <nav className="flex flex-wrap gap-1">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-2.5 py-1.5 text-sm ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {onManual ? null : (
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="outline" onClick={resetPlant} disabled={busy !== null}>
                  Reset plant
                </ActionButton>
                <ActionButton onClick={solvePlant} busy={busy === "solve"} disabled={busy !== null}>
                  {busy === "solve" ? "Solving…" : dirty ? "Solve plant (edits waiting)" : "Solve plant"}
                </ActionButton>
              </div>
            )}
          </div>
          {onManual ? null : lastAction || dirty ? (
            <p className="text-xs text-muted-foreground">
              {dirty
                ? "Assay or spec edits are waiting. Press Solve plant to re-allocate each book."
                : lastAction}
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        {onManual ? null : solverStatus === "infeasible" ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>No feasible plant allocation</AlertTitle>
            <AlertDescription>
              <p>{solve.message}</p>
              {solve.bindingConstraints.length > 0 ? (
                <p className="mt-1">
                  Binding: {solve.bindingConstraints.map((item) => item.label).join(", ")}.
                </p>
              ) : null}
              {solve.cheapestRelax ? (
                <p className="mt-1">Cheapest relax: {solve.cheapestRelax.label}.</p>
              ) : null}
              {solve.relaxOptions.length > 0 ? (
                <p className="mt-1">
                  Tried {solve.relaxOptions.map((item) => `${item.label}${item.feasible ? " (works)" : ""}`).join(", ")}.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {onManual || !showEconomics ? null : <EconomicsStrip />}
        {children}
      </main>

      <AssayDialog
        component={editing}
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        onChange={(patch) => {
          if (editingId) updateComponent(editingId, patch);
        }}
      />
    </div>
  );
}
