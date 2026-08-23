# Gasoline blender

A **Gulf Coast component book**. Price naphtha and blendstocks in **$/gal** against a fungible pipeline or export destination. Blend heel + new components to a published spec, and ship.

## What it does

- **Destinations** — P1 / P2 / P3 are lifts. Spec slate picks the market (CPL CBOB, Explorer, SFPP West Coast BOB, Mexico) and that market’s blend pool.
- **Two spec rows** — pipe receipt vs finished. Overlay 10 ppm S / 0.62% benzene is finished only and starts off. Turning it off does not change the pipe tariff.
- **RVP** — CBOB class and finished E10 are separate. 1-psi waiver only for E10 in a true 9.0 class. No 8.8 hack on Colonial 7.8.
- **Heel** — leftover barrels and quality go into the LP. Inventory and capacity constrain the lift. A mixed tank can fail. Zero heel is a clean-batch thought experiment, not an on-spec ticket.
- **RFS** — obligation on hydrocarbon gallons, RIN credit after denaturant, Mexico off. Three $/bbl numbers: obligation, credit, net.
- **Octane** — blending octane numbers on ethanol and FCC (plus a simple E10 synergy). The BON used is shown. Alkylate vs FCC flips if BON or price changes.
- **Infeasible** — binding constraints and the cheapest relax (1 bbl alk, 0.1 AKI, 1 ppm S, 0.01% benzene, 0.1 psi).
- **Naphtha** — goal-seek uses the same LP implied value as the header. A debit card, if shown, is a heuristic — not the bid.
- **Distillation** — D86 T50/T90/DI are volume-linear approximations. SFPP is not called certified CARBOB.

Defaults in `src/lib/blend/defaults.ts` are editable. They are not a price truth — type your book.

## Run it

```bash
npm install
npm run check:blend
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. The plant LP is a two-phase simplex in `src/lib/blend`.
