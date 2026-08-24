export type SiteNavLink = {
  href: string;
  label: string;
  end?: boolean;
};

export type SiteNavSection = {
  title: string;
  links: SiteNavLink[];
};

export type UserRole = "student" | "parent" | "teacher";

export const ROLE_STORAGE_KEY = "pathwise-selected-role";

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Студент",
  parent: "Родитель",
  teacher: "Учитель",
};

export const ROLE_ENTRY_PATHS: Record<UserRole, string> = {
  student: "/onboarding",
  parent: "/hub/roditeli",
  teacher: "/hub/uchitelya",
};

export const ROLE_NAV_SECTIONS: Record<UserRole, SiteNavSection[]> = {
  student: [
    {
      title: "Студент",
      links: [
        { href: "/", label: "Главная", end: true },
        { href: "/onboarding", label: "Старт" },
        { href: "/learning", label: "Обучение" },
        { href: "/results", label: "План" },
        { href: "/roadmap", label: "Roadmap" },
        { href: "/grants", label: "Гранты" },
        { href: "/portfolio", label: "Портфолио" },
        { href: "/profile", label: "Профиль" },
        { href: "/support", label: "Поддержка" },
      ],
    },
  ],
  parent: [
    {
      title: "Родитель",
      links: [
        { href: "/hub/roditeli", label: "Кабинет" },
        { href: "/hub/agent", label: "AI-наставник", end: true },
        { href: "/hub/vuzy", label: "Университеты" },
      ],
    },
  ],
  teacher: [
    {
      title: "Учитель",
      links: [
        { href: "/hub/uchitelya", label: "Кабинет" },
        { href: "/hub/obuchenie", label: "Обучение" },
        { href: "/hub/uchenik", label: "Ученики" },
        { href: "/hub/agent", label: "AI-наставник", end: true },
        { href: "/hub/vuzy", label: "Университеты" },
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
