import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { STUDENT_PATHS, studentHref } from '@pathwise/shared/links'
import { withAssetBase } from '../lib/publicUrl'
import { useTenantTheme } from '../enterprise/TenantThemeContext'
import { SITE_NAME } from '../site'

const TITLE_BY_PATH: Record<string, string> = {
  '/agent': `${SITE_NAME} — AI-наставник`,
  '/uchenik': `${SITE_NAME} — Ученики`,
  '/vuzy': `${SITE_NAME} — Университеты Казахстана`,
  '/roditeli': `${SITE_NAME} — Родители`,
  '/uchitelya': `${SITE_NAME} — Учителя`,
  '/enterprise': `${SITE_NAME} — Enterprise`,
}

const NAV: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/agent', label: 'AI-наставник', end: true },
  { to: '/vuzy', label: 'Университеты' },
  { to: '/uchenik', label: 'Ученики' },
  { to: '/roditeli', label: 'Родители' },
  { to: '/uchitelya', label: 'Учителя' },
  { to: '/enterprise', label: 'Enterprise' },
]

export function AppLayout() {
  const { tenant } = useTenantTheme()
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = TITLE_BY_PATH[pathname] ?? SITE_NAME
  }, [pathname])

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-12 min-w-12 max-w-full items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition-colors no-underline ${
      isActive
        ? 'bg-pathwise-accent text-white shadow-pathwise'
        : 'text-foreground ring-1 ring-pathwise-line hover:bg-pathwise-accentSoft/60'
    }`

  return (
    <div className="min-h-screen bg-pathwise-page text-foreground">
      <header className="sticky top-0 z-30 border-b-2 border-pathwise-line bg-pathwise-surface/90 shadow-pathwise backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:px-5">
          <NavLink to="/agent" className="flex min-h-12 min-w-12 items-center no-underline" aria-label={SITE_NAME}>
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
          </NavLink>

          <nav className="-mx-1 flex flex-1 flex-wrap gap-1" aria-label="Разделы">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <a
            href={studentHref(
              STUDENT_PATHS.onboarding,
              import.meta.env.VITE_STUDENT_URL ?? '',
            )}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-pathwise-accent px-4 text-sm font-semibold text-white no-underline shadow-pathwise transition-colors hover:bg-[color:var(--pw-accent-strong)]"
            aria-label="Открыть онбординг ученика в новой вкладке"
            target="_blank"
            rel="noreferrer"
          >
            Онбординг ученика →
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-5 md:py-8">
        <Outlet />
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
