import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_TENANT_ID, TENANTS, getTenant, type TenantBranding } from './tenantConfig'

type TenantThemeContextValue = {
  tenantId: string
  setTenantId: (id: string) => void
  tenant: TenantBranding
}

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null)

const TENANT_IDS = new Set(Object.keys(TENANTS))

function applyCssVars(t: TenantBranding) {
  const r = document.documentElement
  r.style.setProperty('--pw-ink', t.colors.ink)
  r.style.setProperty('--pw-muted', t.colors.muted)
  r.style.setProperty('--pw-surface', t.colors.surface)
  r.style.setProperty('--pw-accent', t.colors.accent)
  r.style.setProperty('--pw-accent-soft', t.colors.accentSoft)
}

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState(DEFAULT_TENANT_ID)

  const tenant = useMemo(() => getTenant(tenantId), [tenantId])

  const setTenantId = useCallback((id: string) => {
    setTenantIdState(TENANT_IDS.has(id) ? id : DEFAULT_TENANT_ID)
  }, [])

  useEffect(() => {
    applyCssVars(tenant)
  }, [tenant])

  const value = useMemo(
    () => ({
      tenantId,
      setTenantId,
      tenant,
    }),
    [tenantId, tenant, setTenantId],
  )

  return <TenantThemeContext.Provider value={value}>{children}</TenantThemeContext.Provider>
}

export function useTenantTheme() {
  const ctx = useContext(TenantThemeContext)
  if (!ctx) throw new Error('useTenantTheme must be used within TenantThemeProvider')
  return ctx
}
