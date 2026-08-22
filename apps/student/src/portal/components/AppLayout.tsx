'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { STUDENT_PATHS, studentHref } from '@pathwise/shared/links'
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

const NAV: Array<{ href: string; label: string; end?: boolean }> = [
  { href: `${HUB}/agent`, label: 'AI-наставник', end: true },
  { href: `${HUB}/vuzy`, label: 'Университеты' },
  { href: `${HUB}/uchenik`, label: 'Ученики' },
  { href: `${HUB}/roditeli`, label: 'Родители' },
  { href: `${HUB}/uchitelya`, label: 'Учителя' },
  { href: `${HUB}/enterprise`, label: 'Enterprise' },
]

function navClass(active: boolean) {
  return `inline-flex min-h-12 min-w-12 max-w-full items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition-colors no-underline ${
    active
      ? 'bg-pathwise-accent text-white shadow-pathwise'
      : 'text-foreground ring-1 ring-pathwise-line hover:bg-pathwise-accentSoft/60'
  }`
}

function isNavActive(pathname: string, href: string, end?: boolean) {
  if (end) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { tenant } = useTenantTheme()
  const pathname = usePathname() || '/'

  useEffect(() => {
    document.title = TITLE_BY_PATH[pathname] ?? SITE_NAME
  }, [pathname])

  return (
    <div className="min-h-screen bg-pathwise-page text-foreground">
      <header className="sticky top-0 z-30 border-b-2 border-pathwise-line bg-pathwise-surface/90 shadow-pathwise backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:px-5">
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

          <nav className="-mx-1 flex flex-1 flex-wrap gap-1" aria-label="Разделы">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={navClass(isNavActive(pathname, n.href, n.end))}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <Link
            href={studentHref(
              STUDENT_PATHS.onboarding,
              process.env.NEXT_PUBLIC_STUDENT_URL?.trim() || undefined,
            )}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-pathwise-accent px-4 text-sm font-semibold text-white no-underline shadow-pathwise transition-colors hover:bg-[color:var(--pw-accent-strong)]"
            aria-label="Онбординг ученика"
          >
            Онбординг ученика →
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-5 md:py-8">
        {children}
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
