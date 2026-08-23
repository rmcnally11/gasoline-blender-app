# Grok bot brief — connect the blender to GitHub

Copy the block below into a **Cursor Grok / Cloud Agent** chat. Do not send it to grok.com as a normal chat unless that session can run `git` and talk to GitHub.

Do **not** use Google Drive. Do **not** email a zip. The destination is GitHub.

---

## PASTE THIS INTO THE OTHER GROK

```
You are connecting an already-built gasoline blender to GitHub so Vercel can serve it.

Do not rebuild unless Path A and Path B both fail. Do not use Google Drive. Do not create a second repo. Do not create a second Vercel project.

## Facts. Do not invent other URLs.

- Complete source already exists in this Cursor cloud agent:
  https://cursor.com/agents/bc-37ccbf0e-41ac-4f3d-a7ce-a90e8e621422
  Workspace remote: origin.cursor.com/git/robert-mcnally/tmp-664cf2e507cbcfc8.git
  Branch: main
  App: Next.js + TypeScript + Tailwind + shadcn. Plant LP in src/lib/blend.
- Destination GitHub (this is what Vercel builds):
  https://github.com/rmcnally11/gasoline-blender-app
  Default branch: main
  Current contents: README.md ONLY. That is why https://gasoline-blender-app.vercel.app is 404.
- Vercel project: gasoline-blender-app
  Production URL: https://gasoline-blender-app.vercel.app
- GitHub owner: rmcnally11
- Original agent can READ that GitHub repo and cannot WRITE it.
  Writes fail with: 403 Resource not accessible by personal access token
  So Cursor's GitHub token is Contents: read-only. That is the only blocker.

Done looks like this:
1. https://github.com/rmcnally11/gasoline-blender-app contains package.json, next.config.ts, src/app, src/lib/blend, src/components/blender
2. Vercel deployment of main is Ready (not a 404)
3. https://gasoline-blender-app.vercel.app shows P1 / P2 / P3 tanks, a blendstock pool, and naphtha goal-seek

## Path A — preferred. Connect the original agent and let IT push.

This puts write credentials on the agent that already has the code.

1. Create a GitHub classic PAT (not fine-grained unless you know how):
   https://github.com/settings/tokens/new
   Note: cursor-blender-push
   Expiration: 7 days
   Check the single scope: repo
   Generate. Copy the token. It starts with ghp_ or github_pat_

2. Open the original agent:
   https://cursor.com/agents/bc-37ccbf0e-41ac-4f3d-a7ce-a90e8e621422

3. Send that agent this exact follow-up. Replace TOKEN with the real token.

   Push the blender to GitHub now. No Drive. Destination is
   https://github.com/rmcnally11/gasoline-blender-app on branch main.
   Use this classic PAT only for git, then do not print it again.

   TOKEN

   Run:

   git remote remove github 2>/dev/null || true
   git remote add github https://x-access-token:TOKEN@github.com/rmcnally11/gasoline-blender-app.git
   git push --force github main

   Then verify with GitHub get_file_contents owner=rmcnally11 repo=gasoline-blender-app path=/
   Success = package.json and src/ are listed.
   Then tell me to open Vercel Deployments and confirm gasoline-blender-app.vercel.app is not 404.

4. After that agent reports success, open Vercel → project gasoline-blender-app → Deployments.
   If a new deployment did not start, click Redeploy on the latest, or Redeploy from main.
   Framework: Next.js. Root directory: .  Build: next build. Output: default.

5. Delete the PAT:
   https://github.com/settings/tokens

If Path A works, stop. Do not rebuild.

## Path B — you are a Cursor agent whose workspace IS gasoline-blender-app

You already have git write to GitHub. The tree is empty except README.md. You do not have the blender source.

Do Path A first (token into the original agent). That is faster and keeps one source of truth.

Only if the user refuses Path A: clone is impossible from origin.cursor.com (private, token-gated). You must recreate the app in THIS repo and git push origin main.

Recreate as a Next.js TypeScript app (App Router) with Tailwind and shadcn/ui. Bind the dev server to 127.0.0.1:43180 if you run it.

Required product:
- Three finished tanks P1 P2 P3 sharing one blendstock pool
- Pool in barrels (inventory, min/max lift), not vol% only
- Spec slates: cpl-cbob, explorer-cbob, sfpp-carbob, mexico-zmvm, mexico-resto
- Distillation T10 T50 T90 E200 E300 and DI = 1.5*T10 + 3*T50 + T90 + 2.4*EtOH vol%
- RVP blending index RVP^1.25
- RVO: obligation on finished gallons, D6 RIN credit on ethanol only
- Simultaneous plant LP (simplex) allocating the shared pool to all three tanks
- Naphtha goal-seek: binary-search purchase price until the header stops taking light or heavy naphtha; that price is implied domestic-barrel value; show octane / sulfur / benzene / DI / RVO debits
- UI: tank cards, pool table, assay dialog, naphtha panel, assumptions

Required paths after your push (names can match this list):
- package.json with scripts: dev, build, start, lint, check:blend
- next.config.ts, tsconfig.json, postcss.config.mjs, components.json, vercel.json
- src/app/page.tsx, layout.tsx, globals.css
- src/lib/blend/{types,math,simplex,specs,distillation,rvo,defaults,properties,optimize,goalseek,format,self-check,index}.ts
- src/components/blender/{blender-app,tank-card,blendstock-table,naphtha-panel,spec-sheet,assay-dialog,assumptions,field-select,number-field,recipe-bar}.tsx
- src/components/ui/* shadcn primitives

Push to origin main. Do not force-push if you have rewritten history unless the repo still has only the README commit.

Then confirm Vercel as in Path A step 4.

## Path C — fix Cursor GitHub MCP so the original agent never needs a PAT

The original agent's GitHub MCP is authenticated as rmcnally11 and can read gasoline-blender-app. Writes return 403 because the token is Contents: read.

On github.com, logged in as rmcnally11:

1. https://github.com/settings/tokens
   Find the token Cursor / GitHub MCP is using. If it is fine-grained:
   Repository access must include gasoline-blender-app (or All repositories).
   Repository permissions must include Contents: Read and write.
   Save.
   If you cannot find it, create a new classic token with repo scope and reconnect GitHub inside Cursor Settings → Integrations / MCP → GitHub. Re-authorize. Grant Contents write when GitHub asks.

2. Also check https://github.com/settings/installations
   If Cursor or "GitHub MCP" is listed, click Configure.
   Repository access: gasoline-blender-app or All.
   Permissions → Repository → Contents: Read and write.
   Permissions → Pull requests: Read and write is fine.
   Save. Approve the email / org prompt if GitHub sends one.

3. Go back to
   https://cursor.com/agents/bc-37ccbf0e-41ac-4f3d-a7ce-a90e8e621422
   Tell it: "permission is on, write-test then push the full app to rmcnally11/gasoline-blender-app"

It must succeed creating a file via GitHub create_or_update_file before it tries a bulk push. If that still 403s, Path C failed — use Path A.

## Checks after any path

GitHub repo root must list more than README.md. At minimum:

- package.json
- next.config.ts
- src/app/page.tsx
- src/lib/blend/optimize.ts
- src/components/blender/blender-app.tsx

Vercel:
- Project linked to rmcnally11/gasoline-blender-app
- Production branch: main
- Latest deployment Ready
- https://gasoline-blender-app.vercel.app is the blender, not 404 NOT_FOUND

## Hard rules

- No Google Drive
- No second GitHub repository
- No second Vercel project
- Do not leave a PAT in a file, commit, README, or chat log after you are done
- Do not "fix" the 404 by changing Vercel to a different repo
- Do not tell the user the GitHub repo is populated if only README.md is there
```
