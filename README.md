# Gasoline blender

A single-grade gasoline **blend header**: typical US blendstocks, ASTM-style finished specs, and a linear program that finds the cheapest on-spec recipe.

This is the right first slice of a gasoline blender model. It is not a full refinery LP. You can change assays, prices, availability, and specs in the browser and immediately see what binds.

## What it does

- Loads a Gulf-Coast-style pool (n-butane, isomerate, LSR, reformate, FCC gasoline, alkylate, hydrocrackate, ethanol, natural gasoline, raffinate).
- Applies Regular 87 / Midgrade 89 / Premium 93 and seasonal RVP classes.
- Locks E10, E0, or flex ethanol, with an optional 1-psi RVP waiver.
- Predicts blend properties with industry-standard first-order rules:
  - Volume-linear blending octane, benzene, aromatics, olefins
  - Chevron RVP index `BI = RVP^1.25`
  - Mass-weighted sulfur and oxygen
- Solves a minimum-cost LP subject to those specs and min/max volume bounds.
- Lets you override the recipe by hand and watch slack go positive or negative.

## Run it

```bash
npm install
npm run check:blend
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

## How to use it as a model

1. Pick the finished grade and RVP class you care about.
2. Press **Solve min-cost**. Binding constraints light up amber.
3. Raise alkylate cost, cut FCC sulfur, or tighten benzene and solve again.
4. Type a manual recipe when you want a what-if that is not optimal.

That loop is the start of a blender: **pool + specs + blend rules + economics**. The next layers — tanks, multi-grade allocation, distillation, and live prices — only help after this header is trustworthy.

## Assumptions worth knowing

- Octane numbers on the pool are **blending** octanes, not neat ASTM RON/MON.
- Ethanol RVP of 18 psi is a splash-blend stand-in for the E10 vapor-pressure bump, not ethanol’s neat RVP.
- Benzene uses the 0.62 vol% MSAT2 average, not the 1.3 cap.
- Aromatics and olefins are internal limits (35% / 18%), not federal maxima.
- Distillation, driveability index, tank heels, and simultaneous regular/premium are not in this slice.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. The LP is a two-phase simplex in `src/lib/blend`.
