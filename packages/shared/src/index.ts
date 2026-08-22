/**
 * Public surface of `@pathwise/shared`.
 *
 * Modules:
 *  - `./generate`      — `POST /api/generate` request/response contract (re-export from `apps/student`).
 *  - `./universities`  — university types used by `apps/portal/vuzy` and student career card.
 *  - `./grants`        — grant record type used by `apps/student` and parent calculator in `apps/portal`.
 *  - `./brand`         — single source of truth for product name, tagline and palette.
 *  - `./links`         — cross-app URLs (student core ↔ b2b portal) used by both apps.
 */
export * from "./brand";
export * from "./links";
export * from "./generate-contract";
export * from "./universities";
export * from "./grants";
