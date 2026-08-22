import { useMemo, useState } from 'react'
import { SITE_NAME } from '../site'
import type { GrantItem } from '../types/pathwise'

type Props = {
  /** Ориентир месячных расходов на обучение / проживание */
  monthlyNeedKzt: number
  grants: GrantItem[]
  studentName: string
}

function formatMoney(n: number) {
  return `${n.toLocaleString('ru-RU')} ₸`
}

/**
 * Родитель вводит доступный месячный бюджет — мгновенно считаем gap и подсвечиваем гранты.
 */
export function FinancialCalculator({ monthlyNeedKzt, grants, studentName }: Props) {
  const [budgetRaw, setBudgetRaw] = useState<string>('80000')

  const budget = Number(budgetRaw.replace(/\s/g, '').replace(/,/g, '')) || 0
  const gap = Math.max(0, monthlyNeedKzt - budget)

  const highlightedIds = useMemo(() => {
    const sorted = [...grants].sort((a, b) => b.amountMonthlyKzt - a.amountMonthlyKzt)
    const ids = new Set<string>()
    if (gap <= 0) return ids

    let covered = 0
    for (const g of sorted) {
      if (covered >= gap) break
      ids.add(g.name)
      covered += g.amountMonthlyKzt
    }
    /* если один грант почти закрывает — всё равно подсветим крупнейшие, покрывающие >= gap */
    if (ids.size === 0) {
      const one = sorted.find((g) => g.amountMonthlyKzt >= gap)
      if (one) ids.add(one.name)
      else sorted.slice(0, 2).forEach((g) => ids.add(g.name))
    }
    return ids
  }, [grants, gap])

  return (
    <section
      className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm"
      aria-labelledby="financial-calc-title"
      data-report-section="calculator"
    >
      <h2 id="financial-calc-title" className="text-lg font-semibold text-pathwise-ink">
        Финансовый калькулятор для семьи
      </h2>
      <p className="mt-1 text-sm text-pathwise-muted">
        Ученик: <span className="font-medium text-pathwise-ink">{studentName}</span>. Введите, сколько
        семья может выделять ежемесячно на учёбу и проживание (ориентир).
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="family-budget" className="text-sm font-medium text-pathwise-ink">
            Доступный месячный бюджет (₸)
          </label>
          <input
            id="family-budget"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={budgetRaw}
            onChange={(e) => setBudgetRaw(e.target.value)}
            className="mt-2 w-full rounded-xl border border-pathwise-line px-4 py-3 text-lg font-semibold tabular-nums shadow-inner focus:border-pathwise-accent"
            aria-describedby="family-budget-help"
          />
          <p id="family-budget-help" className="mt-2 text-xs text-pathwise-muted">
            Ориентир стоимости в {SITE_NAME}:{' '}
            <span className="font-medium text-pathwise-ink">{formatMoney(monthlyNeedKzt)}</span> / мес.
          </p>
        </div>

        <div
          className="flex flex-col justify-center rounded-xl bg-pathwise-surface p-4 ring-1 ring-pathwise-line"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase text-pathwise-muted">Финансовый разрыв (gap)</p>
          <p
            className={`mt-2 text-3xl font-bold tabular-nums ${gap > 0 ? 'text-amber-600' : 'text-pathwise-accent'}`}
          >
            {formatMoney(gap)}
          </p>
          <p className="mt-2 text-sm text-pathwise-muted">
            {gap > 0
              ? 'Ниже подсвечены гранты, которые в сумме помогают закрыть этот разрыв (упрощённая модель).'
              : 'Бюджет покрывает ориентир — разрыва нет. Гранты всё равно могут снизить нагрузку на семью.'}
          </p>
        </div>
      </div>

      <h3 className="mt-8 text-sm font-semibold text-pathwise-ink">Гранты и стипендии</h3>
      <ul className="mt-2 space-y-2" aria-label="Список грантов">
        {grants.map((g) => {
          const active = highlightedIds.has(g.name)
          return (
            <li
              key={g.name}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                active
                  ? 'border-pathwise-accent bg-pathwise-accentSoft ring-2 ring-pathwise-accent/30'
                  : 'border-pathwise-line bg-pathwise-surface'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-pathwise-ink">{g.name}</span>
                {active && (
                  <span className="rounded-full bg-pathwise-accent px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    закрывает gap
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-pathwise-muted">
                <span>{g.amountLabel}</span>
                <span>≈ {formatMoney(g.amountMonthlyKzt)} / мес (экв.)</span>
                <span>срок: {g.deadline}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
