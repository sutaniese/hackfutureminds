import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
    `inline-flex min-h-[40px] items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors no-underline ${
      isActive
        ? 'bg-pathwise-accent text-white shadow-sm'
        : 'text-pathwise-ink hover:bg-pathwise-accentSoft'
    }`

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <NavLink to="/agent" className="flex items-center gap-2 no-underline" aria-label={SITE_NAME}>
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.displayName}
                className="h-8 w-8 rounded-lg object-contain"
                width={32}
                height={32}
              />
            ) : (
              <span
                className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-1 text-[11px] font-bold text-white"
                style={{ backgroundColor: 'var(--pw-accent)' }}
                aria-hidden
              >
                {tenant.logoMark}
              </span>
            )}
            <span className="text-base font-semibold tracking-tight text-pathwise-ink">
              {SITE_NAME}
            </span>
            <span className="hidden text-xs text-pathwise-muted sm:inline">· {tenant.displayName}</span>
          </NavLink>

          <nav className="-mx-1 flex flex-1 flex-wrap gap-1" aria-label="Разделы">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-pathwise-muted">
          {SITE_NAME} · карьерная навигация для школьников Казахстана · MVP
        </div>
      </footer>
    </div>
  )
}
