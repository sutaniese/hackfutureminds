export type SiteNavLink = {
  href: string;
  label: string;
  end?: boolean;
};

export type SiteNavSection = {
  title: string;
  links: SiteNavLink[];
};

export const SITE_NAV_SECTIONS: SiteNavSection[] = [
  {
    title: "Студент",
    links: [
      { href: "/", label: "Главная", end: true },
      { href: "/onboarding", label: "Старт" },
      { href: "/results", label: "План" },
      { href: "/grants", label: "Гранты" },
      { href: "/portfolio", label: "Портфолио" },
    ],
  },
  {
    title: "Портал",
    links: [
      { href: "/hub/agent", label: "AI-наставник", end: true },
      { href: "/hub/vuzy", label: "Университеты" },
      { href: "/hub/uchenik", label: "Ученики" },
      { href: "/hub/roditeli", label: "Родители" },
      { href: "/hub/uchitelya", label: "Учителя" },
      { href: "/hub/enterprise", label: "Enterprise" },
    ],
  },
];

export function isSiteNavActive(pathname: string, link: SiteNavLink) {
  if (link.end) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}
