'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import {
  ROLE_ENTRY_PATHS,
  ROLE_LABELS,
  ROLE_NAV_SECTIONS,
  isSiteNavActive,
} from '@/lib/site-nav'
import { RoleRouteGuard } from '@/components/shell/RoleRouteGuard'
import { RouteTransition } from '@/components/shell/RouteTransition'
import { useSelectedRole } from '@/components/shell/useSelectedRole'
import { useAuth } from '@/components/shell/useAuth'
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
  [`${HUB}/obuchenie`]: `${SITE_NAME} — Обучение`,
  [`${HUB}/enterprise`]: `${SITE_NAME} — Enterprise`,
}

function navClass(active: boolean) {
  return `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold transition-all no-underline ${
    active
      ? 'bg-[#6C63FF] text-white shadow-sm'
      : 'border border-slate-200 bg-white text-pathwise-muted hover:bg-white hover:text-slate-900'
  }`
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { tenant } = useTenantTheme()
  const pathname = usePathname() || '/'
  const { role, ready } = useSelectedRole()
  const { user, status, logout } = useAuth()
  const sections = role ? ROLE_NAV_SECTIONS[role] : []
  const accountLabel = user?.name?.trim() || user?.email || ''

  useEffect(() => {
    document.title = TITLE_BY_PATH[pathname] ?? SITE_NAME
  }, [pathname])

  return (
    <div className="min-h-screen bg-pathwise-page text-foreground">
      <header className="sticky top-0 z-30 border-b border-pathwise-line bg-white/95 shadow-pathwise ">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
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
                  className="h-9 w-9 rounded-xl border border-slate-200 object-contain"
                  width={36}
                  height={36}
                />
              ) : (
                <span
                  className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-1 text-[12px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: 'var(--pw-primary, var(--pw-accent))' }}
                  aria-hidden
                >
                  {tenant.logoMark}
                </span>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-pathwise-accent-strong">
                {role ? `Роль: ${ROLE_LABELS[role]}` : 'Вход по роли'}
              </p>
              <p className="truncate text-sm font-semibold text-pathwise-ink">
                {user
                  ? accountLabel
                  : role
                    ? 'Показываем только доступные разделы'
                    : 'Выберите студента, родителя или учителя на главной'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {status === 'authed' && user ? (
                <Link
                  href={ROLE_ENTRY_PATHS[user.role]}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-pathwise-muted no-underline transition hover:bg-white hover:text-slate-900"
                >
                  Кабинет
                </Link>
              ) : null}
              {status === 'authed' ? (
                <button
                  type="button"
                  onClick={logout}
                  className="pw-btn-primary inline-flex min-h-12 items-center justify-center px-4 text-sm"
                >
                  Выйти
                </button>
              ) : status === 'guest' ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-foreground no-underline transition hover:bg-white"
                  >
                    Войти
                  </Link>
                  <Link
                    href="/register"
                    className="pw-btn-primary inline-flex min-h-12 items-center justify-center px-4 text-sm no-underline"
                  >
                    Регистрация
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <div className="pw-glass mt-3 rounded-[1.6rem] p-3">
            <div className="flex flex-col gap-2">
              {ready && sections.length === 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/" className={navClass(pathname === '/')}>
                    Выбрать вход
                  </Link>
                </div>
              ) : null}
              {sections.map((section) => (
                <div key={section.title} className="flex min-w-0 items-center gap-3">
                  <span className="hidden shrink-0 whitespace-nowrap rounded-full bg-slate-50 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-pathwise-muted ring-1 ring-slate-200 sm:inline-flex">
                    {section.title}
                  </span>
                  <nav
                    className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-1"
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

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <RouteTransition>
          <div className="space-y-6">
            <RoleRouteGuard>{children}</RoleRouteGuard>
          </div>
        </RouteTransition>
      </main>

      <footer className="mt-10 border-t border-pathwise-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-5 text-xs text-pathwise-muted md:px-6">
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
