import { EnterpriseHub } from '../components/EnterpriseHub'

export function EnterprisePage() {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-pathwise-ink md:text-3xl">Enterprise / ЕНТ-центры</h1>
        <p className="mt-2 max-w-3xl text-sm text-pathwise-muted">
          White-label бренд, грантовый ROI, CRM sync (мок), массовые отчёты для родителей.
        </p>
      </div>
      <EnterpriseHub />
    </>
  )
}
