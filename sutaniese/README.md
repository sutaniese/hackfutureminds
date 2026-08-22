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

- **Handler:** `src/app/api/generate/route.ts` — `generateDeterministic` in `src/lib/generate/deterministic.ts` (careers, finance from `api/grants.json` matching, portfolio text). If **`ANTHROPIC_API_KEY`** is set, `src/lib/generate/anthropic-optional.ts` is tried first; on failure or if unset, the same deterministic output is used (demo always works). See `.env.example` for optional env vars. **Request parsing & validation:** `src/lib/generate/parse-request.ts`. Use `Content-Type: application/json` and the `GenerateRequest` shape in `src/types/generate.ts`.

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
