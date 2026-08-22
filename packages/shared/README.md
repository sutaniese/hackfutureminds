# `@pathwise/shared`

Shared TypeScript types, brand tokens, and cross-app URL helpers consumed by both
`apps/student` (Next.js — student core) and `apps/portal` (Vite — parents,
teachers, enterprise, universities catalog).

## Modules

| Module | Purpose |
|--------|---------|
| `./brand` | Product name, tagline, primary palette (`BRAND`) |
| `./links` | Cross-app URLs: `portalHref`, `studentHref`, `PORTAL_PATHS`, `STUDENT_PATHS` |
| `./generate` | `POST /api/generate` types: `GenerateRequest`, `GenerateResponse` |
| `./universities` | `University` and related catalog types |
| `./grants` | `GrantRecord` shape used by results page and parent calculator |

## Why a workspace package

Both apps used to reference the same names locally; the package keeps them in
sync without bundling either runtime (Next.js or Vite) into the other.
