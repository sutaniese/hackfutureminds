import { FormEvent, useState } from 'react'
import { SITE_NAME } from '../site'

export type MarketSide = {
  salaryRangeKzt: string
  demand: string
  outlook5y: string
}

export type CompareResult = {
  parentMarket: MarketSide
  childMarket: MarketSide
  summary: string
  source: 'gemini' | 'fallback'
}

type Props = {
  childProfession: string
}

/**
 * Родитель вводит «свою» профессию — сравнение с выбором ребёнка через Gemini API (dev: Vite middleware).
 */
export function CareerComparison({ childProfession }: Props) {
  const [parentProfession, setParentProfession] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResult | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/career-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentProfession: parentProfession.trim(),
          childProfession: childProfession.trim(),
          region: 'Казахстан',
        }),
      })
      const data = (await res.json()) as CompareResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="career-compare-title"
      data-report-section="career-compare"
    >
      <h2 id="career-compare-title" className="text-lg font-semibold text-pathwise-ink">
        Сравнение профессий
      </h2>
      <p className="mt-1 text-sm text-pathwise-muted">
        Выбор ребёнка в {SITE_NAME}:{' '}
        <span className="font-semibold text-pathwise-ink">{childProfession || '—'}</span>. Введите
        профессию, которую вы считаете более подходящей — мы запросим у Gemini ориентиры по рынку (KZ).
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="parent-profession" className="text-sm font-medium text-pathwise-ink">
            Ваша профессия для сравнения
          </label>
          <input
            id="parent-profession"
            type="text"
            required
            value={parentProfession}
            onChange={(e) => setParentProfession(e.target.value)}
            placeholder="Например: государственный служащий / бухгалтер / юрист"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-pathwise-accent"
            aria-describedby="parent-profession-hint"
          />
          <p id="parent-profession-hint" className="mt-1 text-xs text-pathwise-muted">
            Для демо нужен ключ <code className="rounded bg-slate-100 px-1">GEMINI_API_KEY</code> в{' '}
            <code className="rounded bg-slate-100 px-1">.env</code> (только dev-сервер, не в браузер).
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || !childProfession.trim()}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-pathwise-accent px-5 py-3 text-sm font-semibold text-white shadow hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Запрос к Gemini…' : 'Сравнить с данными рынка'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 grid gap-4 md:grid-cols-2" role="region" aria-label="Результат сравнения">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-pathwise-ink">Ваш вариант</h3>
            <p className="mt-1 text-xs text-pathwise-muted">{parentProfession}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-pathwise-muted">Зарплата (ориентир)</dt>
                <dd className="font-medium">{result.parentMarket.salaryRangeKzt}</dd>
              </div>
              <div>
                <dt className="text-pathwise-muted">Спрос</dt>
                <dd>{result.parentMarket.demand}</dd>
              </div>
              <div>
                <dt className="text-pathwise-muted">5 лет</dt>
                <dd>{result.parentMarket.outlook5y}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border border-pathwise-accent/40 bg-pathwise-accentSoft/50 p-4">
            <h3 className="text-sm font-semibold text-pathwise-ink">Выбор ребёнка</h3>
            <p className="mt-1 text-xs text-pathwise-muted">{childProfession}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-pathwise-muted">Зарплата (ориентир)</dt>
                <dd className="font-medium">{result.childMarket.salaryRangeKzt}</dd>
              </div>
              <div>
                <dt className="text-pathwise-muted">Спрос</dt>
                <dd>{result.childMarket.demand}</dd>
              </div>
              <div>
                <dt className="text-pathwise-muted">5 лет</dt>
                <dd>{result.childMarket.outlook5y}</dd>
              </div>
            </dl>
          </div>
          <div className="md:col-span-2 rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
            <p className="font-semibold text-white">Итог для семьи</p>
            <p className="mt-2 leading-relaxed">{result.summary}</p>
            <p className="mt-2 text-xs text-slate-400">
              Источник данных: {result.source === 'gemini' ? 'Gemini API' : 'резервный текст (fallback)'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
