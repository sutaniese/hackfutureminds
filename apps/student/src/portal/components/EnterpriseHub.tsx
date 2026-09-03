import { useTenantTheme } from '../enterprise/TenantThemeContext'
import { TENANTS } from '../enterprise/tenantConfig'
import { withAssetBase } from '../lib/publicUrl'
import { EnterpriseAnalytics } from './EnterpriseAnalytics'

export function EnterpriseHub() {
  const { tenant, tenantId, setTenantId } = useTenantTheme()

  return (
    <div className="space-y-8">
      <section className="pw-card p-6">
        <h2 className="text-lg font-semibold text-pathwise-ink">White-label (tenant_id)</h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          Цвета и логотип берутся из контекста и CSS-переменных Tailwind — весь интерфейс перекрашивается под
          бренд центра.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label htmlFor="tenant-select" className="text-sm font-medium text-pathwise-ink">
            tenant_id
          </label>
          <select
            id="tenant-select"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="pw-input px-3 py-2 text-sm font-medium"
          >
            {Object.values(TENANTS).map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 ring-1 ring-pathwise-line">
            {tenant.logoUrl ? (
              <img
                src={withAssetBase(tenant.logoUrl)}
                alt={tenant.displayName}
                className="h-10 w-10 rounded-lg object-contain"
                width={40}
                height={40}
              />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--pw-accent)' }}
                aria-hidden
              >
                {tenant.logoMark}
              </span>
            )}
            <div>
              <p className="text-xs text-pathwise-muted">Текущий бренд</p>
              <p className="text-sm font-semibold text-pathwise-ink">{tenant.displayName}</p>
            </div>
          </div>
        </div>
      </section>

      <EnterpriseAnalytics />
    </div>
  )
}
