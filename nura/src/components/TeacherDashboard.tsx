import { FormEvent, useCallback, useMemo, useState } from 'react'
import { buildSeedClasses } from '../data/classroomSeed'
import { downloadClassAchievementsReport } from '../lib/exportClassAchievements'
import type { ClassStudentRow, TeacherClass } from '../types/teacher'
import type { StudentProfile } from '../types/pathwise'

const INITIAL_CLASSES = buildSeedClasses()

function generateInviteCode(existing: Set<string>) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 40; attempt++) {
    let s = 'PW-'
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
    if (!existing.has(s)) return s
  }
  return `PW-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

function newClassId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `class-${crypto.randomUUID()}`
  return `class-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function TeacherDashboard() {
  const [classes, setClasses] = useState<TeacherClass[]>(INITIAL_CLASSES)
  const [activeId, setActiveId] = useState(INITIAL_CLASSES[0]?.id ?? '')
  const [newName, setNewName] = useState('11«Б» — профориентация')
  const [letterLang, setLetterLang] = useState<'kk' | 'ru' | 'en'>('ru')
  const [letterStudentId, setLetterStudentId] = useState<string>('')
  const [letterLoading, setLetterLoading] = useState(false)
  const [letterText, setLetterText] = useState('')
  const [letterMeta, setLetterMeta] = useState<string | null>(null)

  const activeClass = useMemo(
    () => classes.find((c) => c.id === activeId) ?? classes[0] ?? null,
    [classes, activeId],
  )

  const onCreateClass = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const name = newName.trim()
      if (!name) return
      const codes = new Set(classes.map((c) => c.inviteCode))
      const inviteCode = generateInviteCode(codes)
      const created: TeacherClass = {
        id: newClassId(),
        name,
        inviteCode,
        students: [],
      }
      setClasses((prev) => [...prev, created])
      setActiveId(created.id)
    },
    [newName, classes],
  )

  const handleExport = () => {
    if (!activeClass) return
    downloadClassAchievementsReport(activeClass, `PathWise_${activeClass.name}`)
  }

  const handleLetter = async () => {
    if (!activeClass) return
    const row = activeClass.students.find((s) => s.id === letterStudentId)
    if (!row) {
      setLetterMeta('Выберите ученика из списка.')
      return
    }
    setLetterLoading(true)
    setLetterMeta(null)
    setLetterText('')
    try {
      const studentPayload: StudentProfile = structuredClone(row.profile)
      const res = await fetch('/api/recommendation-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: letterLang, student: studentPayload }),
      })
      const data = (await res.json()) as { letter?: string; source?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setLetterText(data.letter ?? '')
      setLetterMeta(data.source === 'gemini' ? 'Gemini API' : 'Резервный текст (fallback)')
    } catch (err) {
      setLetterMeta(err instanceof Error ? err.message : 'Ошибка запроса')
    } finally {
      setLetterLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-labelledby="teacher-dash-title"
      >
        <h2 id="teacher-dash-title" className="text-lg font-semibold text-pathwise-ink">
          Учительский дашборд
        </h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          Создание класса, код приглашения, свод по ученикам и инструменты для отчёта директору.
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Классы">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === activeClass?.id}
              onClick={() => setActiveId(c.id)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                c.id === activeClass?.id
                  ? 'bg-pathwise-accent text-white shadow'
                  : 'bg-pathwise-surface text-pathwise-ink ring-1 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {activeClass && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={onCreateClass}
              className="rounded-xl border border-dashed border-slate-300 bg-pathwise-surface/60 p-4"
              aria-label="Создать новый класс"
            >
              <h3 className="text-sm font-semibold text-pathwise-ink">Новый класс</h3>
              <label htmlFor="new-class-name" className="mt-3 block text-xs font-medium text-pathwise-muted">
                Название класса
              </label>
              <input
                id="new-class-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pathwise-accent"
              />
              <button
                type="submit"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-pathwise-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Создать класс и сгенерировать код
              </button>
              <p className="mt-2 text-xs text-pathwise-muted">
                Код приглашения уникален в рамках ваших классов на этом устройстве (демо в браузере).
              </p>
            </form>

            <div className="rounded-xl border border-pathwise-accent/30 bg-pathwise-accentSoft/40 p-4">
              <h3 className="text-sm font-semibold text-pathwise-ink">Текущий класс</h3>
              <p className="mt-2 text-sm text-pathwise-muted">Название</p>
              <p className="text-base font-semibold text-pathwise-ink">{activeClass.name}</p>
              <p className="mt-4 text-sm text-pathwise-muted">Код приглашения</p>
              <p
                className="mt-1 font-mono text-2xl font-bold tracking-widest text-pathwise-ink"
                aria-live="polite"
              >
                {activeClass.inviteCode}
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(activeClass.inviteCode)
                }}
                className="mt-3 text-sm font-medium text-pathwise-accent underline-offset-2 hover:underline"
              >
                Скопировать код
              </button>
            </div>
          </div>
        )}
      </section>

      {activeClass && (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          aria-labelledby="class-table-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="class-table-title" className="text-lg font-semibold text-pathwise-ink">
                Сводный дашборд класса
              </h2>
              <p className="mt-1 text-sm text-pathwise-muted">
                Онбординг, направления PathWise, флаг финансовой поддержки.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-pathwise-accent bg-white px-4 py-2 text-sm font-semibold text-pathwise-accent hover:bg-pathwise-accentSoft"
            >
              Экспорт достижений класса (CSV)
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-pathwise-surface text-xs font-semibold uppercase text-pathwise-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Ученик
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Онбординг
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Направления
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Фин. помощь
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeClass.students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-pathwise-muted">
                      В классе пока нет учеников. Отправьте им код <strong>{activeClass.inviteCode}</strong> (демо).
                    </td>
                  </tr>
                ) : (
                  activeClass.students.map((s) => <StudentTableRow key={s.id} row={s} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeClass && (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          aria-labelledby="rec-letter-title"
        >
          <h2 id="rec-letter-title" className="text-lg font-semibold text-pathwise-ink">
            Рекомендательное письмо (AI)
          </h2>
          <p className="mt-1 text-sm text-pathwise-muted">
            JSON-профиль выбранного ученика отправляется на{' '}
            <code className="rounded bg-slate-100 px-1">/api/recommendation-letter</code> (Gemini, dev через Vite).
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="letter-student" className="text-sm font-medium text-pathwise-ink">
                Ученик
              </label>
              <select
                id="letter-student"
                value={letterStudentId}
                onChange={(e) => setLetterStudentId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-pathwise-accent"
              >
                <option value="">— выберите —</option>
                {activeClass.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.profile.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-sm font-medium text-pathwise-ink">Язык письма</span>
              <fieldset className="mt-2 flex flex-wrap gap-3">
                {(
                  [
                    ['kk', 'Қазақша'],
                    ['ru', 'Русский'],
                    ['en', 'English'],
                  ] as const
                ).map(([code, label]) => (
                  <label
                    key={code}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-pathwise-accent has-[:checked]:bg-pathwise-accentSoft"
                  >
                    <input
                      type="radio"
                      name="letter-lang"
                      value={code}
                      checked={letterLang === code}
                      onChange={() => setLetterLang(code)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLetter}
            disabled={letterLoading || !letterStudentId}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-pathwise-accent px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {letterLoading ? 'Генерация…' : 'Сгенерировать письмо'}
          </button>
          {letterMeta && <p className="mt-2 text-xs text-pathwise-muted">{letterMeta}</p>}
          {letterText && (
            <pre
              className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-sm text-slate-100"
              tabIndex={0}
            >
              {letterText}
            </pre>
          )}
        </section>
      )}
    </div>
  )
}

function StudentTableRow({ row }: { row: ClassStudentRow }) {
  return (
    <tr className="hover:bg-pathwise-surface/80">
      <td className="px-4 py-3 font-medium text-pathwise-ink">{row.profile.displayName}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.onboardingComplete ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {row.onboardingComplete ? 'завершён' : 'не завершён'}
        </span>
      </td>
      <td className="max-w-xs px-4 py-3 text-pathwise-muted">
        {row.careerDirections.filter(Boolean).join(' · ') || '—'}
      </td>
      <td className="px-4 py-3">
        {row.needsFinancialHelp ? (
          <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-900">
            нуждается
          </span>
        ) : (
          <span className="text-xs text-pathwise-muted">нет</span>
        )}
      </td>
    </tr>
  )
}
