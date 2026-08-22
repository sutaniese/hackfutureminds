import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTenantTheme } from '../enterprise/TenantThemeContext'
import { SITE_NAME } from '../site'

const TITLE_BY_PATH: Record<string, string> = {
  '/agent': `${SITE_NAME} — AI-наставник`,
  '/uchenik': `${SITE_NAME} — Ученики`,
  '/roditeli': `${SITE_NAME} — Родители`,
  '/uchitelya': `${SITE_NAME} — Учителя`,
  '/enterprise': `${SITE_NAME} — Enterprise`,
}

export function AppLayout() {
  const { tenant } = useTenantTheme()
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = TITLE_BY_PATH[pathname] ?? SITE_NAME
  }, [pathname])

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold no-underline ${
      isActive ? 'bg-pathwise-ink text-white' : 'bg-white text-pathwise-ink ring-1 ring-slate-200 hover:bg-slate-50'
    }`

  return (
    <div className="min-h-screen pb-16 pt-8">
      <header className="mx-auto max-w-5xl px-4">
        <div className="flex flex-wrap items-center gap-3">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.displayName}
              className="h-9 w-9 rounded-lg object-contain ring-1 ring-slate-200"
              width={36}
              height={36}
            />
          ) : (
            <span
              className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-1 text-[10px] font-bold leading-none text-white shadow-sm"
              style={{ backgroundColor: 'var(--pw-accent)' }}
              aria-hidden
            >
              {tenant.logoMark}
            </span>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pathwise-accent">{SITE_NAME}</p>
            <p className="text-[11px] text-pathwise-muted">Центр: {tenant.displayName}</p>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Разделы">
          <NavLink to="/agent" className={navCls} end>
            AI-наставник
          </NavLink>
          <NavLink to="/uchenik" className={navCls}>
            Ученики
          </NavLink>
          <NavLink to="/roditeli" className={navCls}>
            Родители
          </NavLink>
          <NavLink to="/uchitelya" className={navCls}>
            Учителя
          </NavLink>
          <NavLink to="/enterprise" className={navCls}>
            Enterprise
          </NavLink>
        </nav>
      </header>

      <div className="mx-auto mt-8 max-w-5xl space-y-6 px-4">
        <Outlet />
      </div>
    </div>
  )
}
