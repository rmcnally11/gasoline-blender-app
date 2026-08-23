# Gasoline blender

A **Gulf Coast component book**. Price naphtha and blendstocks in **$/gal** against a fungible pipeline or export destination. Lock naphtha you already own, goal-seek what you can buy to blend to spec, and ship.

## What it does

- **Destinations** — P1 / P2 / P3 are lifts. Spec slate picks the market (CPL CBOB, Explorer, SFPP CARBOB, Mexico) and that market’s blend pool.
- **Component book** — every stream has a market $/gal and an implied $/gal versus the destination. Buy if market ≤ implied.
- **Naphtha tanks** — must-use barrels force owned naphtha into the blend, then the LP shops the other components.
- **Freight** — pipeline tariff or export freight in $/gal, inside the netback and the implied values.
- **RVO** — obligation on finished gallons, D6 credit on ethanol only.
- **Specs** — D4814 / DI, Tier 3 + MSAT2 overlay, CaRFG3-style CARBOB, NOM-016.

## Run it

```bash
npm install
npm run check:blend
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

## How to use it

1. Set the destination marker and freight in $/gal on the lift tank.
2. Type component markets in $/gal. Set must-use on naphtha you own.
3. Press **Value versus destination**.
4. Net = marker − components − RVO − freight.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. The plant LP is a two-phase simplex in `src/lib/blend`.
