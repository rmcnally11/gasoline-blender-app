# Gasoline blender

A **three-tank gasoline blend header**. P1, P2, and P3 each have a grade and a spec slate. The slate picks a region — Colonial, Explorer, West Coast, or Mexico — and **each region has its own blendstock pool**. Tanks on the same region compete for those barrels. Tanks on different regions do not.

## What it does

- **P1 / P2 / P3 tanks** — finished-product tanks with their own grade, pipeline slate, season, ethanol lock, inventory, capacity, and blend demand.
- **Regional pools** — Colonial (CPL CBOB), Explorer (Explorer CBOB), West Coast (SFPP CARBOB), and Mexico (NOM-016 ZMVM and resto). Defaults are not one copied inventory list.
- **Spec slates**
  - CPL CBOB and Explorer CBOB (D4814 distillation and driveability index)
  - Optional Tier 3 10 ppm sulfur + MSAT2 0.62 vol% benzene overlay on US CBOB
  - SFPP CARBOB (CaRFG3-style caps)
  - Mexico NOM-016 ZMVM and resto del país (same Mexico pool, different specs)
- **Distillation / DI** — T10, T50, T90, E200/E300, DI = 1.5 T10 + 3 T50 + T90 + 2.4 × ethanol vol%.
- **RVO** — obligation on finished gasoline gallons, D6 RIN credit only on ethanol. Naphtha adds obligated barrels and no RINs.
- **Naphtha goal-seek** — per region. Binary-search that region’s purchase price until its tanks stop taking that naphtha. Debits show octane, sulfur, benzene, distillation, and RVO.

## Run it

```bash
npm install
npm run check:blend
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

Pages: `/` plant desk, `/p1` `/p2` `/p3` one tank each, `/manual` user manual. Economics are $/gal.

## How to use it

1. Set each tank's grade, slate, and demand (defaults: P1 and P3 Colonial regular, P2 Explorer regular).
2. Open the matching region tab and put in that pool’s inventories and prices.
3. Press **Solve plant**. Binding sulfur, benzene, octane, RVP, or DI light up on each tank.
4. Enter a light or heavy naphtha offer on that region and **Goal-seek values**.
5. If implied value ≥ offer, the naphtha **creates a domestic barrel** in that region.

Replace the demo assays and prices with yours in the pool table or the assay dialog.

## Assumptions

- Octane numbers are blending octanes.
- Ethanol RVP of 18 psi approximates the E10 splash bump.
- US CBOB pipeline receipt is 80 ppm S / 3.8% benzene; the overlay tightens that to domestic compliance.
- Mexico tanks default to E0. US tanks default to E10.
- RVO is a single D6 obligation, not the full nested RFS.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. The plant LP is a two-phase simplex in `src/lib/blend`.
