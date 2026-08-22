"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAV_SECTIONS, isSiteNavActive } from "@/lib/site-nav";
import { SHELL_PX } from "@/lib/shell-layout";

function navClass(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold no-underline transition-colors ${
    active
      ? "bg-pathwise-accent text-white shadow-pathwise"
      : "bg-pathwise-surface/80 text-foreground ring-1 ring-pathwise-line hover:bg-pathwise-accent-soft/70"
  }`;
}

export function UnifiedSiteNav() {
  const pathname = usePathname() || "/";

  return (
    <section className="border-b-2 border-pathwise-line bg-pathwise-surface/90 shadow-pathwise backdrop-blur">
      <div className={`${SHELL_PX} mx-auto max-w-6xl py-3`}>
        <div className="rounded-[1.6rem] border border-pathwise-line/80 bg-gradient-to-r from-pathwise-accent-soft via-pathwise-surface to-pathwise-surface p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 lg:w-56">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-pathwise-accent-strong">
                Единая платформа
              </p>
              <p className="mt-1 text-sm font-semibold text-pathwise-ink">
                Ученик, семья, школа и вузы в одном интерфейсе
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {SITE_NAV_SECTIONS.map((section) => (
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
          </div>
        </div>
      </div>
    </section>
  );
}
