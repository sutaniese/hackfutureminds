'use client'

import { ENTERPRISE_FLOW_STATS } from '../data/enterpriseAnalyticsMock'
import { EnterpriseAnalyticsCharts } from './EnterpriseAnalyticsCharts'

const PIE_COLORS = ['#0d9488', '#64748b', '#cbd5e1']

/**
 * Грантовый ROI-трекер для B2B: суммы, воронка поступления, топ профессий.
 */
export function EnterpriseAnalytics() {
  const s = ENTERPRISE_FLOW_STATS
  const admissionPct = Math.round(s.admissionOrOfferRate * 100)

  const pieData = s.pipelineStages.map((p, i) => ({
    name: p.name,
    value: p.value,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))

  return (
    <section
      className="space-y-8 rounded-2xl border border-pathwise-line bg-white p-6 shadow-sm"
      aria-labelledby="enterprise-analytics-title"
    >
      <header>
        <h2 id="enterprise-analytics-title" className="text-lg font-semibold text-pathwise-ink">
          Грантовый ROI-трекер
        </h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          Агрегированный поток: <strong>{s.cohortSize}</strong> учеников (демо-данные для защиты).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-pathwise-line bg-white p-4">
          <p className="text-xs font-semibold uppercase text-pathwise-muted">Гранты (сумма)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-pathwise-ink">
            {(s.totalGrantsAwardedKzt / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ₸
          </p>
          <p className="mt-1 text-xs text-pathwise-muted">Подтверждённые начисления за год (мок)</p>
        </div>
        <div className="rounded-xl border border-pathwise-line bg-white p-4">
          <p className="text-xs font-semibold uppercase text-pathwise-muted">Поступившие / оффер</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-pathwise-accent">{admissionPct}%</p>
          <p className="mt-1 text-xs text-pathwise-muted">Доля с подтверждённым результатом (мок)</p>
        </div>
        <div className="rounded-xl border border-pathwise-line bg-white p-4">
          <p className="text-xs font-semibold uppercase text-pathwise-muted">Активных в воронке</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-pathwise-ink">{s.cohortSize}</p>
          <p className="mt-1 text-xs text-pathwise-muted">Размер потока в отчёте</p>
        </div>
      </div>

      <EnterpriseAnalyticsCharts s={s} pieData={pieData} />
    </section>
  )
}
