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
        { href: "/", label: "Вход", end: true },
        { href: "/onboarding", label: "Старт" },
        { href: "/results", label: "План" },
        { href: "/grants", label: "Гранты" },
        { href: "/portfolio", label: "Портфолио" },
      ],
    },
  ],
  parent: [
    {
      title: "Родитель",
      links: [
        { href: "/", label: "Вход", end: true },
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
        { href: "/", label: "Вход", end: true },
        { href: "/hub/uchitelya", label: "Класс" },
        { href: "/hub/uchenik", label: "Ученики" },
        { href: "/hub/agent", label: "AI-наставник", end: true },
        { href: "/hub/vuzy", label: "Университеты" },
      ],
    },
  ],
};

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
    pathname === "/results" ||
    pathname.startsWith("/results/") ||
    pathname === "/grants" ||
    pathname.startsWith("/grants/") ||
    pathname === "/portfolio" ||
    pathname.startsWith("/portfolio/")
  ) {
    return "student";
  }
  if (pathname === "/hub/roditeli" || pathname.startsWith("/hub/roditeli/")) {
    return "parent";
  }
  if (
    pathname === "/hub/uchitelya" ||
    pathname.startsWith("/hub/uchitelya/") ||
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
  const sections = ROLE_NAV_SECTIONS[role];
  return sections.some((section) =>
    section.links.some((link) => isSiteNavActive(pathname, link)),
  );
}
