export type SiteNavLink = {
  href: string;
  labelKey: string;
  end?: boolean;
};

export type SiteNavSection = {
  titleKey: string;
  links: SiteNavLink[];
};

export type UserRole = "student" | "parent" | "teacher";

export const ROLE_STORAGE_KEY = "pathwise-selected-role";

/** Russian fallbacks for non-UI (CSV / server). UI should use `role.{id}` via i18n. */
export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Ученик",
  parent: "Родитель",
  teacher: "Учитель",
};

export const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  student: "role.student",
  parent: "role.parent",
  teacher: "role.teacher",
};

export const ROLE_ENTRY_PATHS: Record<UserRole, string> = {
  student: "/",
  parent: "/hub/roditeli",
  teacher: "/hub/uchitelya",
};

export const ROLE_NAV_SECTIONS: Record<UserRole, SiteNavSection[]> = {
  student: [
    {
      titleKey: "hub.nav.student",
      links: [
        { href: "/", labelKey: "nav.home", end: true },
        { href: "/onboarding", labelKey: "nav.onboarding" },
        { href: "/learning", labelKey: "nav.learning" },
        { href: "/learning/class", labelKey: "nav.class" },
        { href: "/results", labelKey: "nav.results" },
        { href: "/roadmap", labelKey: "nav.roadmap" },
        { href: "/grants", labelKey: "nav.grants" },
        { href: "/portfolio", labelKey: "nav.portfolio" },
        { href: "/profile", labelKey: "nav.profile" },
        { href: "/support", labelKey: "nav.support" },
      ],
    },
  ],
  parent: [
    {
      titleKey: "hub.nav.parent",
      links: [
        { href: "/hub/roditeli", labelKey: "nav.cabinet" },
        { href: "/hub/agent", labelKey: "nav.agent", end: true },
        { href: "/hub/vuzy", labelKey: "nav.universities" },
      ],
    },
  ],
  teacher: [
    {
      titleKey: "hub.nav.teacher",
      links: [
        { href: "/hub/uchitelya", labelKey: "nav.cabinet" },
        { href: "/hub/obuchenie", labelKey: "nav.teacherLearn" },
        { href: "/hub/uchenik", labelKey: "nav.students" },
        { href: "/hub/agent", labelKey: "nav.agent", end: true },
        { href: "/hub/vuzy", labelKey: "nav.universities" },
      ],
    },
  ],
};

/** Home for a signed-in account — never the marketing landing for teacher/parent. */
export function cabinetPathForRole(role: UserRole): string {
  return ROLE_ENTRY_PATHS[role];
}

export function isStudentOnlyPath(pathname: string): boolean {
  return roleForPath(pathname) === "student";
}

export function isSiteNavActive(pathname: string, link: SiteNavLink) {
  if (link.end) return pathname === link.href;
  if (link.href === "/learning") {
    return pathname === "/learning" || (pathname.startsWith("/learning/") && !pathname.startsWith("/learning/class"));
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function isUserRole(value: string | null): value is UserRole {
  return value === "student" || value === "parent" || value === "teacher";
}

export function roleForPath(pathname: string): UserRole | null {
  if (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/learning" ||
    pathname.startsWith("/learning/") ||
    pathname === "/results" ||
    pathname.startsWith("/results/") ||
    pathname === "/roadmap" ||
    pathname.startsWith("/roadmap/") ||
    pathname === "/grants" ||
    pathname.startsWith("/grants/") ||
    pathname === "/portfolio" ||
    pathname.startsWith("/portfolio/") ||
    pathname === "/support" ||
    pathname.startsWith("/support/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  ) {
    return "student";
  }
  if (pathname === "/hub/roditeli" || pathname.startsWith("/hub/roditeli/")) {
    return "parent";
  }
  if (
    pathname === "/hub/uchitelya" ||
    pathname.startsWith("/hub/uchitelya/") ||
    pathname === "/hub/obuchenie" ||
    pathname.startsWith("/hub/obuchenie/") ||
    pathname === "/hub/uchenik" ||
    pathname.startsWith("/hub/uchenik/")
  ) {
    return "teacher";
  }
  return null;
}

export function isPathAllowedForRole(pathname: string, role: UserRole): boolean {
  if (pathname === "/" || pathname === "/accessibility" || pathname.startsWith("/accessibility/")) {
    return true;
  }
  // University catalog is shared — Get Started must work for every role.
  if (pathname === "/hub/vuzy" || pathname.startsWith("/hub/vuzy/")) {
    return true;
  }
  if (role === "student" && (pathname === "/profile" || pathname.startsWith("/profile/"))) {
    return true;
  }
  const sections = ROLE_NAV_SECTIONS[role];
  return sections.some((section) =>
    section.links.some((link) => isSiteNavActive(pathname, link)),
  );
}
