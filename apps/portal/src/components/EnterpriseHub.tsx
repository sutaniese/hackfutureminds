import { useState } from 'react'
import { ENTERPRISE_COHORT } from '../data/enterpriseCohort'
import { useTenantTheme } from '../enterprise/TenantThemeContext'
import { TENANTS } from '../enterprise/tenantConfig'
import { downloadBulkParentReportsZip } from '../lib/bulkParentReportsZip'
import { EnterpriseAnalytics } from './EnterpriseAnalytics'

export function EnterpriseHub() {
  const { tenant, tenantId, setTenantId } = useTenantTheme()
  const [crmLoading, setCrmLoading] = useState(false)
  const [crmResult, setCrmResult] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  async function runCrmSync() {
    setCrmLoading(true)
    setCrmResult(null)
    try {
      const res = await fetch('/api/crm-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, batch_size: ENTERPRISE_COHORT.length }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error ?? res.statusText))
      setCrmResult(JSON.stringify(data, null, 2))
    } catch (e) {
      setCrmResult(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setCrmLoading(false)
    }
  }

  async function runBulkReports() {
    setBulkBusy(true)
    try {
      await downloadBulkParentReportsZip(ENTERPRISE_COHORT, tenant.displayName)
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm">
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
            className="min-h-[44px] rounded-xl border border-pathwise-line px-3 py-2 text-sm font-medium focus:border-pathwise-accent"
          >
            {Object.values(TENANTS).map((t) => (
              <option key={t.id} value={t.id}>
                {t.displayName}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3 rounded-xl bg-pathwise-surface px-4 py-2 ring-1 ring-pathwise-line">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
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

      <section className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-pathwise-ink">CRM-синхронизация (демо)</h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          Мок-эндпоинт <code className="rounded bg-pathwise-accentSoft px-1">POST /api/crm-sync</code> имитирует выгрузку
          карточек учеников во внешнюю CRM.
        </p>
        <button
          type="button"
          onClick={runCrmSync}
          disabled={crmLoading}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-pathwise-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {crmLoading ? 'Синхронизация…' : 'Запустить CRM sync'}
        </button>
        {crmResult && (
          <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-100">
            {crmResult}
          </pre>
        )}
      </section>

      <section className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-pathwise-ink">Массовые отчёты для родителей</h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          Генерация ZIP-архива с персональными текстовыми отчётами по каждому ученику демо-потока (
          {ENTERPRISE_COHORT.length} файлов + список).
        </p>
        <button
          type="button"
          onClick={runBulkReports}
          disabled={bulkBusy}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-pathwise-accent bg-pathwise-accentSoft px-5 py-3 text-sm font-semibold text-pathwise-ink hover:bg-pathwise-accentSoft/80 disabled:opacity-50"
        >
          {bulkBusy ? 'Сборка архива…' : 'Сгенерировать отчёты для всего потока (ZIP)'}
        </button>
      </section>
    </div>
  )
}
