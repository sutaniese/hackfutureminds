'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import {
  ROLE_LABELS,
  ROLE_NAV_SECTIONS,
  isSiteNavActive,
} from '@/lib/site-nav'
import { RoleRouteGuard } from '@/components/shell/RoleRouteGuard'
import { useSelectedRole } from '@/components/shell/useSelectedRole'
import { withAssetBase } from '../lib/publicUrl'
import { useTenantTheme } from '../enterprise/TenantThemeContext'
import { SITE_NAME } from '../site'

const HUB = '/hub'

const TITLE_BY_PATH: Record<string, string> = {
  [`${HUB}/agent`]: `${SITE_NAME} — AI-наставник`,
  [`${HUB}/uchenik`]: `${SITE_NAME} — Ученики`,
  [`${HUB}/vuzy`]: `${SITE_NAME} — Университеты Казахстана`,
  [`${HUB}/roditeli`]: `${SITE_NAME} — Родители`,
  [`${HUB}/uchitelya`]: `${SITE_NAME} — Учителя`,
  [`${HUB}/enterprise`]: `${SITE_NAME} — Enterprise`,
}

function navClass(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold transition-colors no-underline ${
    active
      ? 'bg-pathwise-accent text-white shadow-pathwise'
      : 'bg-pathwise-surface/80 text-foreground ring-1 ring-pathwise-line hover:bg-pathwise-accentSoft/60'
  }`
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { tenant } = useTenantTheme()
  const pathname = usePathname() || '/'
  const { role, ready, clearRole } = useSelectedRole()
  const sections = role ? ROLE_NAV_SECTIONS[role] : []

  useEffect(() => {
    document.title = TITLE_BY_PATH[pathname] ?? SITE_NAME
  }, [pathname])

  return (
    <div className="min-h-screen bg-pathwise-page text-foreground">
      <header className="sticky top-0 z-30 border-b-2 border-pathwise-line bg-pathwise-surface/90 shadow-pathwise backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link
              href={`${HUB}/agent`}
              className="flex min-h-12 min-w-12 items-center no-underline"
              aria-label={SITE_NAME}
            >
              {tenant.logoUrl ? (
                <img
                  src={withAssetBase(tenant.logoUrl)}
                  alt={SITE_NAME}
                  className="h-9 w-9 rounded-xl border border-pathwise-line/80 object-contain"
                  width={36}
                  height={36}
                />
              ) : (
                <span
                  className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-1 text-[12px] font-bold text-white"
                  style={{ backgroundColor: 'var(--pw-primary, var(--pw-accent))' }}
                  aria-hidden
                >
                  {tenant.logoMark}
                </span>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-pathwise-accentStrong">
                {role ? `Роль: ${ROLE_LABELS[role]}` : 'Вход по роли'}
              </p>
              <p className="text-sm font-semibold text-pathwise-ink">
                {role
                  ? 'Показываем только доступные разделы'
                  : 'Выберите студента, родителя или учителя на главной'}
              </p>
            </div>

            <Link
              href="/"
              onClick={clearRole}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-pathwise-accent px-4 text-sm font-semibold text-white no-underline shadow-pathwise transition-colors hover:bg-[color:var(--pw-accent-strong)]"
              aria-label="Сменить роль"
            >
              Сменить роль
            </Link>
          </div>

          <div className="mt-3 rounded-[1.6rem] border border-pathwise-line/80 bg-gradient-to-r from-pathwise-accentSoft via-pathwise-surface to-pathwise-surface p-3">
            <div className="flex flex-col gap-2">
              {ready && sections.length === 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/" className={navClass(pathname === '/')}>
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
                        className={navClass(isSiteNavActive(pathname, link))}
                        aria-current={isSiteNavActive(pathname, link) ? 'page' : undefined}
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
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-5 md:py-8">
        <RoleRouteGuard>{children}</RoleRouteGuard>
      </main>

      <footer className="mt-10 border-t-2 border-pathwise-line bg-pathwise-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 text-xs text-pathwise-muted md:px-5">
          {tenant.logoUrl ? (
            <img
              src={withAssetBase(tenant.logoUrl)}
              alt=""
              aria-hidden
              className="h-7 w-7 rounded-lg border border-pathwise-line/80 object-contain opacity-90"
              width={28}
              height={28}
            />
          ) : (
            <span
              className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-md px-1 text-[10px] font-bold text-white"
              style={{ backgroundColor: 'var(--pw-primary, var(--pw-accent))' }}
              aria-hidden
            >
              {tenant.logoMark}
            </span>
          )}
          <span>карьерная навигация для школьников Казахстана · MVP</span>
        </div>
      </footer>
    </div>
  )
}
