# PathWise — Student module (`sutaniese`)

Next.js (App Router) frontend with Tailwind CSS. API-style generation is implemented via **Next.js Route Handlers** under `src/app/api/` (see `student_dev_EN.md` for the `POST /api/generate` contract). Shared data such as the grants database will live under `api/` at the project root.

## Layout

| Path | Purpose |
|------|---------|
| `src/` | App UI, components, and `app/api/*` route handlers |
| `public/` | Static assets |
| `api/` | Server-side data (e.g. hardcoded grant JSON) — to be filled in a later step |
| `student_dev_EN.md` | Product and API spec for the student experience |

## Mobile shell (in-app)

All primary UI is under the `(mobile)` route group with a `max-w-md` column, a **fixed bottom navigation** (min ~48px targets), a **top bar** (high contrast, voice preference, and link to help), a **skip link** to `#main`, and shared `pw-` design tokens in `src/app/globals.css` (placeholders: onboarding, results, grants, portfolio; full flows come in later steps).

## Onboarding (step 3)

`/onboarding` runs a **7-step** flow: questions match `student_dev_EN.md` (subjects, free time, achievements, work style, KZ vs abroad, city, budget). **Step X of 7** + bar at the top; answers are held in **React state**; on **Finish** they are also written to `sessionStorage` as `pathwise-onboarding-answers` for the next demo step (e.g. `/api/generate`).

## Data models and grants (step 4)

- **Types:** `src/types/generate.ts` (`GenerateRequest` / `GenerateResponse`, `CareerMapItem`, `FinancialRoute`, `MatchedGrantSummary` aligned with `student_dev_EN.md`), `src/types/grants.ts` (`GrantRecord` with KZ fields), **onboarding** remains in `src/types/onboarding.ts`.
- **Grants database:** `api/grants.json` (30+ hardcoded programs, demo annotations: tags, KZ relevance, `suggestedMatchBlurb` as a match reason, and `coverageContributionKzt` for later stacking in `/api/generate`). **Loader:** `src/lib/grants-data.ts` (`ALL_GRANTS`, `getGrantById`, `grantCount`).

## `POST /api/generate` (step 5)

- **Handler:** `src/app/api/generate/route.ts` — `generateDeterministic` in `src/lib/generate/deterministic.ts` (careers, finance from `api/grants.json` matching, portfolio text). If **`GROQ_API_KEY`** is set, `src/lib/generate/groq-optional.ts` calls the Groq OpenAI-compatible chat API once; on failure or if unset, the same deterministic output is used (demo always works). See `.env.example` for optional env vars. **Request parsing & validation:** `src/lib/generate/parse-request.ts`. Use `Content-Type: application/json` and the `GenerateRequest` shape in `src/types/generate.ts`.

## Results experience and gamification (step 6)

- **`/results`:** The three artifacts are shown on one screen: **career map** (3 paths, KZT salary callouts), **financial route** (monthly need, coverage bar, **matched grants** with match level), **resume-ready** portfolio text.
- **Persistence:** A successful `POST /api/generate` is saved in `sessionStorage` as `pathwise-last-generate` (v1 JSON with an onboarding snapshot + `GenerateResponse`). The next visit to Results restores it when the snapshot matches the current `pathwise-onboarding-answers`.
- **Gamification:** `src/lib/gamification.ts` (portfolio fill %, profile complete rule) + `src/components/results/ResultsGamificationBar.tsx` (badge, **+N grants** line, progress). Grant list and section entrance use `globals.css` animation classes; motion is limited when `prefers-reduced-motion: reduce`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run production server after build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

**Node.js 20+** is required (see `package.json` `engines`).

If `node_modules` was copied or installed on a slow Windows mount and packages look incomplete (missing `next`, missing Tailwind’s native `oxide` module, or `tsc` not found), delete `node_modules`, keep `package-lock.json`, and run `npm install` again from a shell on a fast disk when possible. Commit the lockfile so `npm ci` is reproducible.

## Deploy (Vercel)

The student app lives in **`sutaniese`**, not at the monorepo root, so Vercel must build **that** folder. If the wrong directory is set, the deployment can show **`404: NOT_FOUND`**.

### 1) Pick the correct “Root directory” (most common fix)

In GitHub, look at the path to **`sutaniese/package.json`**.

| You see in the repo | Set Vercel → Settings → **General** → **Root directory** to |
|----------------------|----------------------------------------------------------------|
| `sutaniese/package.json` at the top level of the default branch | **`sutaniese`** |
| `hacksteppe/sutaniese/...` (or any extra folder in front) | the **full** path, e.g. **`hacksteppe/sutaniese`**, not `sutaniese` only |

If you are unsure, open the repo in the browser: the Root directory must be the folder that **contains** the Next `package.json` and `vercel.json`.

### 2) Vercel build settings (leave defaults for Next)

- **Framework:** Next.js
- Do **not** set a custom **output directory** for Next; leave the output empty and let Vercel’s Next.js integration handle it. A wrong “Output” (e.g. `out` or `dist` without `output: 'export'`) breaks routing and yields 404s.
- **Production branch** (e.g. `main`) must be the one you push to. Redeploy after any root change.

### 3) Verify the app that is live

Open **`/api/health`**. You should get JSON: `{"ok":true,"service":"sutaniese"}`. If that 404s, this Next app is not what is running (wrong root, failed build, or old URL).

### 4) If it still 404s

- **Deployments** → latest → **Build** log must be **success**.
- Re-check **Settings** → **General** → Root directory, **Save**, then **Redeploy**.
- Or delete the Vercel project and **Import** the repo again, setting the root in the first wizard to the path from step 1.

## Getting started

```bash
cd hacksteppe/sutaniese
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Next.js resources

- [Next.js documentation](https://nextjs.org/docs)
- [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
