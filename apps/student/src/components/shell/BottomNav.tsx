"use client";

import { SHELL_PX } from "@/lib/shell-layout";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  labelKey:
    | "nav.home"
    | "nav.onboarding"
    | "nav.learning"
    | "nav.results"
    | "nav.roadmap"
    | "nav.grants"
    | "nav.portfolio";
  isActive: (path: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

const items: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.home",
    isActive: (p) => p === "/" || p === "",
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/onboarding",
    labelKey: "nav.onboarding",
    isActive: (p) => p.startsWith("/onboarding"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: "/learning",
    labelKey: "nav.learning",
    isActive: (p) => p.startsWith("/learning"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M22 10L12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-5" />
      </svg>
    ),
  },
  {
    href: "/results",
    labelKey: "nav.results",
    isActive: (p) => p.startsWith("/results"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/roadmap",
    labelKey: "nav.roadmap",
    isActive: (p) => p.startsWith("/roadmap"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="5" cy="18" r="2.5" />
        <circle cx="12" cy="6" r="2.5" />
        <circle cx="19" cy="15" r="2.5" />
        <path d="M7 16l3.5-7.5" />
        <path d="M14 7.5l3.2 5.3" />
      </svg>
    ),
  },
  {
    href: "/grants",
    labelKey: "nav.grants",
    isActive: (p) => p.startsWith("/grants"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    labelKey: "nav.portfolio",
    isActive: (p) => p.startsWith("/portfolio"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const { t } = useI18n();
  const path = usePathname() || "/";

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
      }}
      role="navigation"
      aria-label={t("nav.aria")}
    >
      <div className={`${SHELL_PX} pb-2`}>
        <div
          className="pointer-events-auto mx-auto grid max-w-2xl grid-cols-7 gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_14px_35px_rgb(15_23_42_/_0.12)] "
          style={{ minHeight: "var(--pw-nav)" }}
        >
          {items.map((item) => {
            const active = item.isActive(path);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 text-[10px] font-semibold leading-tight no-underline transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary sm:text-xs ${
                  active
                    ? "bg-[#6C63FF] text-white shadow-sm"
                    : "text-pathwise-muted hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span aria-hidden className="shrink-0">
                  {item.icon(active)}
                </span>
                <span className="w-full truncate text-center">
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
