# `@pathwise/shared`

Shared TypeScript types, brand tokens, and URL helpers consumed by the unified
`apps/student` Next.js app. The student shell and B2B hub (`/hub/*`) live in the
same app, while shared types stay here to avoid duplicating contracts.

## Modules

| Module | Purpose |
|--------|---------|
| `./brand` | Product name, tagline, primary palette (`BRAND`) |
| `./links` | `PORTAL_HUB_BASE` (`/hub`), `portalHref` / `studentHref` (same-origin by default), `PORTAL_PATHS`, `STUDENT_PATHS` |
| `./generate` | `POST /api/generate` types: `GenerateRequest`, `GenerateResponse` |
| `./universities` | `University` and related catalog types |
| `./grants` | `GrantRecord` shape used by results page and parent calculator |

## Why a workspace package

The student flow, B2B hub, and server routes reference the same shapes. This
package keeps those contracts in sync without tying feature code to one folder.
