/**
 * Public surface of `@pathwise/shared`.
 *
 * Modules:
 *  - `./generate`      — `POST /api/generate` request/response contract (re-export from `apps/student`).
 *  - `./universities`  — university types used by `/hub/vuzy` and student career card.
 *  - `./grants`        — grant record type used by student results and `/hub` parent calculator.
 *  - `./brand`         — single source of truth for product name, tagline and palette.
 *  - `./links`         — same-origin URLs between student shell and `/hub`.
 *  - `./clips`         — baked topic video filenames and public /clips URLs.
 */
export * from "./brand";
export * from "./links";
export * from "./generate-contract";
export * from "./universities";
export * from "./grants";
export * from "./clips";
export * from "./grade-access";
