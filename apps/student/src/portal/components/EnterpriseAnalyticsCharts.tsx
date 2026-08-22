/* eslint-disable @typescript-eslint/ban-ts-comment -- recharts class components vs strict JSX typing */
// @ts-nocheck
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
import type { ENTERPRISE_FLOW_STATS } from '../data/enterpriseAnalyticsMock'

type FlowStats = typeof ENTERPRISE_FLOW_STATS

type PieDatum = { name: string; value: number; fill: string }

export function EnterpriseAnalyticsCharts({
  s,
  pieData,
}: {
  s: FlowStats
  pieData: PieDatum[]
}) {
  return (
    <>
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
    </>
  )
}
