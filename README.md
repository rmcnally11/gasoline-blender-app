# gasoline-blender-app

Gasoline blend header for team use on Vercel.

A small web tool for refinery blending teams: mix gasoline blendstocks and see
whether the resulting blend meets grade spec for octane (AKI), Reid Vapor
Pressure (RVP), ethanol content, and cost. Built with Next.js (App Router) and
deployable on Vercel.

## How it works

- **Blend engine** (`src/lib/blend.ts`) — pure functions that blend octane and
  density linearly by volume and blend RVP with the Chevron blending-index
  correlation (`BI = RVP^1.25`), then grade the blend against a spec.
- **API** (`src/app/api/blend/route.ts`) — `GET` returns the default blendstock
  library and grade specs; `POST` computes and grades a blend.
- **UI** (`src/app/page.tsx`) — the "blend header" dashboard: set component
  volumes, pick a target grade and season, and get live on-spec/off-spec
  feedback. All calculations run server-side through the API.

## Getting started

```bash
npm ci          # install dependencies
npm run dev     # start the dev server on http://localhost:3000
```

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Start the Next.js dev server         |
| `npm run build`  | Production build                     |
| `npm start`      | Serve the production build           |
| `npm run lint`   | Run ESLint                           |
| `npm test`       | Run the blend-engine unit tests      |

## Cloud Agent environment

`.cursor/environment.json` configures the Cursor Cloud Agent environment:
`npm ci` installs dependencies and a `dev` terminal runs `npm run dev` on port
3000.
