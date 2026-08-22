"use client";

import { SHELL_PX } from "@/lib/shell-layout";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSelectedRole } from "./useSelectedRole";

type NavItem = {
  href: string;
  labelKey: "nav.home" | "nav.onboarding" | "nav.results" | "nav.grants" | "nav.portfolio";
  isActive: (path: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

const items: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.home",
    isActive: (p) => p === "/" || p === "",
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="currentColor"
        aria-hidden
      >
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5Z" />
      </svg>
    ),
  },
  {
    href: "/onboarding",
    labelKey: "nav.onboarding",
    isActive: (p) => p.startsWith("/onboarding"),
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="currentColor"
        aria-hidden
      >
        <path d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2zm0 4h8v2H4v-2z" />
      </svg>
    ),
  },
  {
    href: "/results",
    labelKey: "nav.results",
    isActive: (p) => p.startsWith("/results"),
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="currentColor"
        aria-hidden
      >
        <path d="M3 3v18h18v-2H5V3H3zm2 4h2v6H5V7zm4-2h2v8H9V5zm4 3h2v5h-2V8zm4-5h2v10h-2V3z" />
      </svg>
    ),
  },
  {
    href: "/grants",
    labelKey: "nav.grants",
    isActive: (p) => p.startsWith("/grants"),
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 2C8 2 4 4 4 6v12c0 1 2 2 4 2h2v2H8v2h8v-2h-2v-2h2c2 0 4-1 4-2V6c0-2-4-4-8-4zm0 2c3 0 5 1 5 2s-2 2-5 2-5-1-5-2 2-2 5-2zM6 8.5C7 9 8.5 9.5 12 9.5s5-.5 6-1V18h-1c0-1-2.5-2-5-2s-5 1-5 2H6V8.5z" />
      </svg>
    ),
  },
  {
    href: "/portfolio",
    labelKey: "nav.portfolio",
    isActive: (p) => p.startsWith("/portfolio"),
    icon: () => (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="currentColor"
        aria-hidden
      >
        <path d="M4 4h7v4H4V4Zm9 0h7v4h-7V4ZM4 10h7v4H4v-4Zm9 0h7v4h-7v-4ZM4 16h7v4H4v-4Zm9 0h7v4h-7v-4Z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const { t } = useI18n();
  const path = usePathname() || "/";
  const { role, ready } = useSelectedRole();

  if (!ready || role !== "student") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-pathwise-line bg-pathwise-surface/95 shadow-[0_-1px_2px_rgb(15_23_42/0.05)] backdrop-blur-sm"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.4rem)",
      }}
      role="navigation"
      aria-label={t("nav.aria")}
    >
      <div
        className={`${SHELL_PX} grid grid-cols-5 gap-1 py-2`}
        style={{ minHeight: "var(--pw-nav)" }}
      >
        {items.map((item) => {
          const active = item.isActive(path);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 text-[10px] font-semibold leading-tight no-underline transition-[background,box-shadow,color,transform] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary active:scale-[0.98] sm:text-xs ${
                active
                  ? "bg-pathwise-accent-soft/95 text-pw-primary ring-1 ring-pathwise-accent"
                  : "text-pathwise-muted ring-1 ring-pathwise-line bg-pathwise-surface/80 hover:bg-pathwise-accent-soft/60 hover:text-foreground"
              } `}
            >
              <span aria-hidden className="shrink-0 [color:inherit]">
                {item.icon(active)}
              </span>
              <span className="w-full truncate text-center [color:inherit]">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
