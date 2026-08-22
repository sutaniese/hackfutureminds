import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ENTERPRISE_FLOW_STATS } from '../data/enterpriseAnalyticsMock'

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
      className="space-y-8 rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm"
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
        <div className="rounded-xl border border-pathwise-line bg-pathwise-surface p-4">
          <p className="text-xs font-semibold uppercase text-pathwise-muted">Гранты (сумма)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-pathwise-ink">
            {(s.totalGrantsAwardedKzt / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ₸
          </p>
          <p className="mt-1 text-xs text-pathwise-muted">Подтверждённые начисления за год (мок)</p>
        </div>
        <div className="rounded-xl border border-pathwise-line bg-pathwise-surface p-4">
          <p className="text-xs font-semibold uppercase text-pathwise-muted">Поступившие / оффер</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-pathwise-accent">{admissionPct}%</p>
          <p className="mt-1 text-xs text-pathwise-muted">Доля с подтверждённым результатом (мок)</p>
        </div>
        <div className="rounded-xl border border-pathwise-line bg-pathwise-surface p-4">
          <p className="text-xs font-semibold uppercase text-pathwise-muted">Активных в воронке</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-pathwise-ink">{s.cohortSize}</p>
          <p className="mt-1 text-xs text-pathwise-muted">Размер потока в отчёте</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-pathwise-ink">Динамика грантов (млн ₸)</h3>
          <div className="mt-3 h-72 w-full" role="img" aria-label="График динамики грантов по месяцам">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.grantVolumeByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v} млн ₸`, 'Объём']} />
                <Legend />
                <Line type="monotone" dataKey="mln" name="Гранты" stroke="var(--pw-accent)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-pathwise-ink">Воронка поступления</h3>
          <div className="mt-3 h-72 w-full" role="img" aria-label="Круговая диаграмма воронки">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieData[i]?.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-pathwise-ink">Топ профессий потока</h3>
        <div className="mt-3 h-80 w-full" role="img" aria-label="Столбчатая диаграмма топ профессий">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.topProfessions} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v, 'Учеников']} />
              <Bar dataKey="count" name="Кол-во" fill="var(--pw-accent)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
