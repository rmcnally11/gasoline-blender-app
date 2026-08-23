# Gasoline blender

A **three-tank gasoline blend header**. P1, P2, and P3 share one blendstock pool. Each tank has its own grade and spec slate (Colonial, Explorer, SFPP, or Mexico). The model allocates barrels across the header, then goal-seeks light and heavy naphtha into a domestic barrel.

## What it does

- **P1 / P2 / P3 tanks** — finished-product tanks with their own grade, pipeline slate, season, ethanol lock, inventory, capacity, and blend demand.
- **Shared pool in barrels** — typical US streams plus light and heavy naphtha. Availability is inventory, not a vol% cap alone.
- **Spec slates**
  - CPL CBOB and Explorer CBOB (D4814 distillation and driveability index)
  - Optional Tier 3 10 ppm sulfur + MSAT2 0.62 vol% benzene overlay on US CBOB
  - SFPP CARBOB (CaRFG3-style caps)
  - Mexico NOM-016 ZMVM and resto del país
- **Distillation / DI** — T10, T50, T90, E200/E300, DI = 1.5 T10 + 3 T50 + T90 + 2.4 × ethanol vol%.
- **RVO** — obligation on finished gasoline gallons, D6 RIN credit only on ethanol. Naphtha adds obligated barrels and no RINs.
- **Naphtha goal-seek** — binary-search the purchase price until the header stops taking that naphtha. That price is the implied domestic-barrel value. Debits show octane, sulfur, benzene, distillation, and RVO.

## Run it

```bash
npm install
npm run check:blend
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

Pages: `/` plant desk, `/p1` `/p2` `/p3` one tank each, `/manual` user manual. Economics are $/gal.

## How to use it

1. Set each tank's grade, slate, and demand (defaults start all three as regular — P1 CPL, P2 Explorer, P3 CPL).
2. Press **Solve plant**. Binding sulfur, benzene, octane, RVP, or DI light up on each tank.
3. Enter a light or heavy naphtha offer and **Goal-seek values**.
4. If implied value ≥ offer, the naphtha **creates a domestic barrel**. If not, the debit table tells you whether sulfur, benzene, octane, DI, or RVO killed it.

Replace the demo assays and prices with yours in the pool table or the assay dialog.

## Assumptions

- Octane numbers are blending octanes.
- Ethanol RVP of 18 psi approximates the E10 splash bump.
- US CBOB pipeline receipt is 80 ppm S / 3.8% benzene; the overlay tightens that to domestic compliance.
- Mexico tanks default to E0. US tanks default to E10.
- RVO is a single D6 obligation, not the full nested RFS.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. The plant LP is a two-phase simplex in `src/lib/blend`.
