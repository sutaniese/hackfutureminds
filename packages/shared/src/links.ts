/**
 * Cross-app links between the student core (`apps/student`, Next.js, default :3000)
 * and the B2B portal (`apps/portal`, Vite, default :5174).
 *
 * In production each app is deployed to its own subdomain. In dev we use ports.
 * Override per-environment with `NEXT_PUBLIC_PORTAL_URL` (student → portal)
 * and `VITE_STUDENT_URL` (portal → student).
 */

export const DEFAULT_PORTAL_URL = "http://localhost:5174";
export const DEFAULT_STUDENT_URL = "http://localhost:3000";

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
  const base = (envUrl ?? DEFAULT_PORTAL_URL).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Build a student-app URL from the portal (uses `VITE_STUDENT_URL` if set). */
export function studentHref(
  path: string,
  envUrl: string | undefined = undefined,
): string {
  const base = (envUrl ?? DEFAULT_STUDENT_URL).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
