"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ROLE_ENTRY_PATHS,
  ROLE_LABEL_KEYS,
  ROLE_NAV_SECTIONS,
  isSiteNavActive,
} from "@/lib/site-nav";
import { SHELL_PX } from "@/lib/shell-layout";
import { useSelectedRole } from "./useSelectedRole";
import { useAuth } from "./useAuth";
import { useI18n } from "@/i18n/I18nProvider";

function navClass(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold no-underline transition-colors ${
    active
      ? "bg-pathwise-accent text-white shadow-pathwise"
      : "bg-white text-foreground ring-1 ring-pathwise-line hover:bg-[#f1efff]"
  }`;
}

export function UnifiedSiteNav() {
  const pathname = usePathname() || "/";
  const { role, ready } = useSelectedRole();
  const { user, status, logout } = useAuth();
  const { t } = useI18n();
  const sections = role ? ROLE_NAV_SECTIONS[role] : [];

  const accountLabel = user?.name?.trim() || user?.email || "";

  return (
    <section className="border-b-2 border-pathwise-line bg-white shadow-pathwise ">
      <div className={`${SHELL_PX} mx-auto max-w-6xl py-3`}>
        <div className="rounded-[1.6rem] border border-pathwise-line/80 bg-white p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 lg:w-56">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-pathwise-accent-strong">
                {role ? t("role.kicker", { role: t(ROLE_LABEL_KEYS[role]) }) : t("role.none")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-pathwise-ink">
                {user
                  ? accountLabel
                  : role
                    ? t("role.sectionsHint")
                    : t("role.pickHint")}
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {ready && sections.length === 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/" className={navClass(pathname === "/")}>
                    {t("nav.pickEntry")}
                  </Link>
                </div>
              ) : null}
              {sections.map((section) => (
                <div key={section.titleKey} className="flex min-w-0 items-center gap-2">
                  <span className="hidden w-16 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-pathwise-muted sm:block">
                    {t(section.titleKey)}
                  </span>
                  <nav
                    className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 pb-1"
                    aria-label={t(section.titleKey)}
                  >
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={isSiteNavActive(pathname, link) ? "page" : undefined}
                        className={navClass(isSiteNavActive(pathname, link))}
                      >
                        {t(link.labelKey)}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {status === "authed" && user ? (
                <Link
                  href={ROLE_ENTRY_PATHS[user.role]}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-pathwise-line bg-white/80 px-3.5 py-2 text-sm font-semibold text-pathwise-muted no-underline transition hover:bg-[#f1efff]"
                >
                  {t("nav.cabinet")}
                </Link>
              ) : null}
              {status === "authed" ? (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-pathwise-accent px-3.5 py-2 text-sm font-semibold text-white shadow-pathwise transition hover:bg-[color:var(--pw-accent-strong)]"
                >
                  {t("nav.logout")}
                </button>
              ) : status === "guest" ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-pathwise-line bg-white/80 px-3.5 py-2 text-sm font-semibold text-foreground no-underline transition hover:bg-[#f1efff]"
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-pathwise-accent px-3.5 py-2 text-sm font-semibold text-white no-underline shadow-pathwise transition hover:bg-[color:var(--pw-accent-strong)]"
                  >
                    {t("nav.register")}
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
