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
- **Naphtha** — goal-seek uses the same LP implied value as the money screen. A debit card, if shown, is a heuristic — not the bid.
- **Distillation** — D86 T50/T90/DI are volume-linear approximations. SFPP is not called certified CARBOB.
- **Marks** — latest Platts Daily row (RB, GC CBOB / Unl87 / CBOB93, Chicago ethanol, D6 only) and the previous Date row for the same-recipe compare. Empty fields stay last typed and show stale / missing. Dummy $104.16 rack / $0.85 RIN are never labeled as Platts. Weekend/holiday uses the last settlement — no fabricated Sunday print.
- **Component Book** — Airtable table on the same base (`nbutane`, `fcc`, `reformate`, `alkylate`, `isomerate`, `lsr`, `heavy-naphtha`). Empty basis and empty override leave the stream stale. Override $/bbl wins; else book = GC CBOB $/bbl + basis cpg × 0.42. Fetch failure is shown — dummy assay prices are not treated as Platts.
- **Inputs** — master book for every stream: use, inventory, must-use, market $/gal, basis vs GC CBOB, override, computed book, source (airtable / typed / stale). Plant and the tanks read this page.
- **Money screen** — after Solve, book vs LP implied and LIFT / DON'T LIFT. Plant also shows last settlement vs prior on the frozen barrels.

Defaults in `src/lib/blend/defaults.ts` are editable assays. They are not a price truth — type your book.

## Run it

```bash
npm install
npm run check:blend
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

Type the component book on **Inputs**. Switch Colonial / Explorer / SFPP / Mexico with tabs — one region on screen, not a long scroll. Plant is P&L / bids. P1 / P2 / P3 are the ticket and the spec.

Production is the existing Vercel project `gasoline_blender_2.0`:
[https://gasolineblender20-bobby-204e.vercel.app](https://gasolineblender20-bobby-204e.vercel.app).
Vercel SSO is on, so open it while logged into that team. `https://gasoline-blender-app.vercel.app` is not an alias on this project.

## Platts Daily (Airtable)

Set these in Vercel Project Settings → Environment Variables (and locally in `.env.local`, never commit):

| Name | Required | Default |
| --- | --- | --- |
| `AIRTABLE_API_KEY` | yes | — |
| `AIRTABLE_BASE_ID` | no | `appokfrHKXUhGXjVo` |
| `AIRTABLE_PLATTS_TABLE_ID` | no | `tbl5y8ORe6aOumuJn` |
| `AIRTABLE_COMPONENT_BOOK_TABLE_ID` | no | `tblSOLXJnXczeLJ07` |

`AIRTABLE_TOKEN` is accepted as an alias for the API key. The app reads the latest Platts Daily row and the previous Date row, mapping only `NYMEX_RB_Implied`, `GC_CBOB_Diff`, `GC_Unl87_Diff`, `GC_CBOB93_Diff`, `Chi_Ethanol_cpg`, and `D6_RIN_cts`. ULSD, jet, CARBOB, NYH, Denver, Tampa, curve, EIA, and HTML report fields are ignored.

Component Book fields mapped: `streamKey`, `name`, `basisCpg`, `overridePerBbl`, `notes`. Unknown `streamKey` values are ignored. Empty numbers stay empty.

Without the key the header says **Marks missing**. Last typed placeholders stay on the page and are flagged stale.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. The plant LP is a two-phase simplex in `src/lib/blend`.
