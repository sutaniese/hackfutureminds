/**
 * Cross-app links between the student core (`apps/student`, Next.js) and the
 * B2B portal (`apps/portal`, Vite).
 *
 * **Unified site (default):** the portal is mounted under the same origin as
 * the student app at `PORTAL_HUB_BASE` (e.g. `/hub`). Next.js proxies `/hub/*`
 * and portal API routes to the Vite dev server in development.
 *
 * **Split deploy:** set `NEXT_PUBLIC_PORTAL_URL` to an absolute origin (e.g.
 * `https://portal.example.com`) and `VITE_STUDENT_URL` for the student origin.
 */

/** Path prefix where the Vite portal is served on the student origin. */
export const PORTAL_HUB_BASE = "/hub";

/** Legacy direct Vite URL (only when not using unified /hub). */
export const DEFAULT_PORTAL_URL = "";
export const DEFAULT_STUDENT_URL = "";

export const PORTAL_PATHS = {
  agent: "/agent",
  parents: "/roditeli",
  teachers: "/uchitelya",
  enterprise: "/enterprise",
  universities: "/vuzy",
  university: (id: string) => `/vuzy/${encodeURIComponent(id)}`,
} as const;

export const STUDENT_PATHS = {
  home: "/",
  onboarding: "/onboarding",
  results: "/results",
  grants: "/grants",
  portfolio: "/portfolio",
  accessibility: "/accessibility",
} as const;

/** Build a portal URL from the student app (uses `NEXT_PUBLIC_PORTAL_URL` if set). */
export function portalHref(
  path: string,
  envUrl: string | undefined = undefined,
): string {
  const raw = (envUrl ?? DEFAULT_PORTAL_URL).trim();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (raw) {
    return `${raw.replace(/\/$/, "")}${p}`;
  }
  const hub = PORTAL_HUB_BASE.replace(/\/$/, "");
  return `${hub}${p}`;
}

/** Build a student-app URL from the portal (uses `VITE_STUDENT_URL` if set). */
export function studentHref(
  path: string,
  envUrl: string | undefined = undefined,
): string {
  const raw = (envUrl ?? DEFAULT_STUDENT_URL).trim();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (raw) {
    return `${raw.replace(/\/$/, "")}${p}`;
  }
  return p;
}
