import { FormEvent, useState } from 'react'
import { readJsonResponse } from '@/lib/http-json'
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
 * Родитель вводит «свою» профессию — сравнение с выбором ребёнка через Gemini API.
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
      const data = (await readJsonResponse<CompareResult>(res)) as CompareResult & { error?: string }
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
      className="pw-card p-6"
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
            className="pw-input mt-2 w-full px-4 py-3 text-sm"
            aria-describedby="parent-profession-hint"
          />
          <p id="parent-profession-hint" className="mt-1 text-xs text-pathwise-muted">
            Для сравнения нужен ключ <code className="rounded bg-pathwise-accent-soft px-1">GEMINI_API_KEY</code> в{' '}
            <code className="rounded bg-pathwise-accent-soft px-1">.env</code> (только сервер, не в браузер).
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || !childProfession.trim()}
          className="pw-btn-primary inline-flex min-h-[48px] min-w-[48px] items-center justify-center px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Запрос к Gemini…' : 'Сравнить с данными рынка'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-2xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-3 py-2 text-sm text-red-100" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="relative mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr]" role="region" aria-label="Результат сравнения">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-pathwise-ink">Ваш вариант</h3>
            <p className="mt-1 text-xs text-pathwise-muted">{parentProfession}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-pathwise-muted">Зарплата (ориентир)</dt>
                <dd className="font-medium">{result.parentMarket.salaryRangeKzt}</dd>
                <div className="mt-2 h-2 rounded-full bg-white"><div className="pw-slide-up h-full w-2/3 rounded-full bg-[#FF6B6B]" /></div>
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
          <div className="flex items-center justify-center">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-pathwise-accent-strong">VS</span>
          </div>
          <div className="rounded-2xl border border-[#6C63FF]/40 bg-[#6C63FF]/10 p-4">
            <h3 className="text-sm font-semibold text-pathwise-ink">Выбор ребёнка</h3>
            <p className="mt-1 text-xs text-pathwise-muted">{childProfession}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-pathwise-muted">Зарплата (ориентир)</dt>
                <dd className="font-medium">{result.childMarket.salaryRangeKzt}</dd>
                <div className="mt-2 h-2 rounded-full bg-white"><div className="pw-slide-up h-full w-4/5 rounded-full bg-[#6C63FF]" /></div>
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-100 md:col-span-3">
            <p className="font-semibold text-white">Итог для семьи</p>
            <p className="mt-2 leading-relaxed">{result.summary}</p>
            <p className="mt-2 text-xs text-pathwise-muted">
              Источник данных: {result.source === 'gemini' ? 'Gemini API' : 'резервный текст (fallback)'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
