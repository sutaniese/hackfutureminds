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

This app is **not** the Git root of `hacksteppe`: the student module lives in the **`sutaniese` folder** next to other packages (e.g. `nura/`), and there is **no** `package.json` at the repository root. If the Vercel import uses the default root, the build is wrong and you may get **`404: NOT_FOUND`** (no viable Next output).

1. Vercel → your project → **Settings** → **General** → **Root Directory** → set to **`sutaniese`**.
2. Framework: **Next.js** (auto). Build: **`npm run build`**, install: **`npm install`** in that directory.
3. **Redeploy** after changing the root. Open the new production URL (Deployments → latest). Use `vercel` CLI the same way: from `sutaniese`, or pass `--cwd sutaniese` as applicable.

`next.config.ts` sets `outputFileTracingRoot` (and Turbopack root for local `next dev --turbopack`) to this app folder so Next does not pick a parent `package-lock.json` in a monorepo.

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
