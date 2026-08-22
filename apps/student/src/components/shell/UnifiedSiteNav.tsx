"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ROLE_LABELS,
  ROLE_NAV_SECTIONS,
  isSiteNavActive,
} from "@/lib/site-nav";
import { SHELL_PX } from "@/lib/shell-layout";
import { useSelectedRole } from "./useSelectedRole";
import { useAuth } from "./useAuth";

function navClass(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold no-underline transition-colors ${
    active
      ? "bg-pathwise-accent text-white shadow-pathwise"
      : "bg-white text-foreground ring-1 ring-pathwise-line hover:bg-[#f1efff]"
  }`;
}

export function UnifiedSiteNav() {
  const pathname = usePathname() || "/";
  const { role, ready, clearRole } = useSelectedRole();
  const { user, status, logout } = useAuth();
  const sections = role ? ROLE_NAV_SECTIONS[role] : [];

  const accountLabel = user?.name?.trim() || user?.email || "";

  return (
    <section className="border-b-2 border-pathwise-line bg-white shadow-pathwise ">
      <div className={`${SHELL_PX} mx-auto max-w-6xl py-3`}>
        <div className="rounded-[1.6rem] border border-pathwise-line/80 bg-white p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 lg:w-56">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-pathwise-accent-strong">
                {role ? `Роль: ${ROLE_LABELS[role]}` : "Вход по роли"}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-pathwise-ink">
                {user
                  ? accountLabel
                  : role
                    ? "Показываем только доступные разделы"
                    : "Выберите студента, родителя или учителя на главной"}
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {ready && sections.length === 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/" className={navClass(pathname === "/")}>
                    Выбрать вход
                  </Link>
                </div>
              ) : null}
              {sections.map((section) => (
                <div key={section.title} className="flex min-w-0 items-center gap-2">
                  <span className="hidden w-16 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-pathwise-muted sm:block">
                    {section.title}
                  </span>
                  <nav
                    className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-1"
                    aria-label={section.title}
                  >
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={isSiteNavActive(pathname, link) ? "page" : undefined}
                        className={navClass(isSiteNavActive(pathname, link))}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {role && status === "authed" ? (
                <Link
                  href="/"
                  onClick={clearRole}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-pathwise-line bg-white/80 px-3.5 py-2 text-sm font-semibold text-pathwise-muted no-underline transition hover:bg-[#f1efff]"
                >
                  Сменить роль
                </Link>
              ) : null}
              {status === "authed" ? (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-pathwise-accent px-3.5 py-2 text-sm font-semibold text-white shadow-pathwise transition hover:bg-[color:var(--pw-accent-strong)]"
                >
                  Выйти
                </button>
              ) : status === "guest" ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-pathwise-line bg-white/80 px-3.5 py-2 text-sm font-semibold text-foreground no-underline transition hover:bg-[#f1efff]"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-pathwise-accent px-3.5 py-2 text-sm font-semibold text-white no-underline shadow-pathwise transition hover:bg-[color:var(--pw-accent-strong)]"
                  >
                    Регистрация
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
