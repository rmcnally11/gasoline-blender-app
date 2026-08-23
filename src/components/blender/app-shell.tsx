"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssayDialog } from "./assay-dialog";
import { ActionButton } from "./action-button";
import { EconomicsStrip } from "./economics-strip";
import { MarksHeader } from "./marks-header";
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
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_46%)] pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:pt-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <p className="hidden text-[11px] font-medium tracking-[0.18em] text-amber-800 uppercase md:block">
              Blend header
            </p>
            <nav className="grid grid-cols-5 gap-1 md:flex md:flex-wrap">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-2.5 py-1.5 text-center text-xs md:text-sm ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    } max-md:flex max-md:min-h-11 max-md:items-center max-md:justify-center max-md:px-1`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {onManual ? null : (
              <div className="hidden flex-wrap gap-2 md:flex">
                <ActionButton variant="outline" onClick={resetPlant} disabled={busy !== null}>
                  Reset plant
                </ActionButton>
                <ActionButton onClick={solvePlant} busy={busy === "solve"} disabled={busy !== null}>
                  {busy === "solve" ? "Solving…" : dirty ? "Solve plant (edits waiting)" : "Solve plant"}
                </ActionButton>
              </div>
            )}
          </div>
          {onManual ? null : <MarksHeader />}
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

      {onManual ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-3 pt-2 pb-[calc(0.7rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-6xl gap-2">
            <ActionButton className="flex-1" variant="outline" onClick={resetPlant} disabled={busy !== null}>
              Reset
            </ActionButton>
            <ActionButton className="flex-[2]" onClick={solvePlant} busy={busy === "solve"} disabled={busy !== null}>
              {busy === "solve" ? "Solving…" : dirty ? "Solve (edits waiting)" : "Solve plant"}
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
