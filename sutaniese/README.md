# PathWise — Student module (`sutaniese`)

Next.js (App Router) frontend with Tailwind CSS. API-style generation is implemented via **Next.js Route Handlers** under `src/app/api/` (see `student_dev_EN.md` for the `POST /api/generate` contract). Shared data such as the grants database will live under `api/` at the project root.

## Layout

| Path | Purpose |
|------|---------|
| `src/` | App UI, components, and `app/api/*` route handlers |
| `public/` | Static assets |
| `api/` | Server-side data (e.g. hardcoded grant JSON) — to be filled in a later step |
| `student_dev_EN.md` | Product and API spec for the student experience |

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
