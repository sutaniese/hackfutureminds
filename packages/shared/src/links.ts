/**
 * Links inside the unified Next app (`apps/student`): student shell routes and
 * the B2B hub under `PORTAL_HUB_BASE` (e.g. `/hub/agent`, `/hub/vuzy`).
 *
 * **Split deploy:** set `NEXT_PUBLIC_PORTAL_URL` to an absolute origin so hub
 * links open on another site; set `NEXT_PUBLIC_STUDENT_URL` (or legacy
 * `VITE_STUDENT_URL`) for absolute student URLs from the hub header.
 */

/** Path prefix for B2B hub routes on the same origin as the student app. */
export const PORTAL_HUB_BASE = "/hub";

/** Optional absolute portal URL for split deploy. */
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

/** Build a student-app URL from the hub (pass `NEXT_PUBLIC_STUDENT_URL` when split). */
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
