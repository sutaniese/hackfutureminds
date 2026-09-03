import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { readJsonResponse } from '@/lib/http-json'
import { downloadClassAchievementsReport } from '../lib/exportClassAchievements'
import { adaptClass } from '../lib/classAdapter'
import { api, type ServerClass } from '../lib/api'
import { useStudents } from '../state/StudentContext'
import type { ClassStudentRow } from '../types/teacher'
import type { StudentProfile } from '../types/pathwise'

export function TeacherDashboard() {
  const { t } = useI18n()
  const { students } = useStudents()
  const [classes, setClasses] = useState<ServerClass[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [newName, setNewName] = useState('11«Б» — профориентация')
  const [letterLang, setLetterLang] = useState<'kk' | 'ru' | 'en'>('ru')
  const [letterStudentId, setLetterStudentId] = useState<string>('')
  const [letterLoading, setLetterLoading] = useState(false)
  const [letterText, setLetterText] = useState('')
  const [letterMeta, setLetterMeta] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const list = await api.listClasses()
      setClasses(list)
      setActiveId((prev) => (prev && list.find((c) => c.id === prev) ? prev : list[0]?.id ?? ''))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('teacher.loadFail'))
    }
  }, [t])

  useEffect(() => {
    void reload()
  }, [reload])

  const activeServerClass = useMemo(
    () => classes.find((c) => c.id === activeId) ?? null,
    [classes, activeId],
  )

  const activeLegacy = useMemo(
    () => (activeServerClass ? adaptClass(activeServerClass, students) : null),
    [activeServerClass, students],
  )

  const onCreateClass = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const name = newName.trim()
      if (!name) return
      try {
        const created = await api.createClass(name)
        setClasses((prev) => [...prev, created])
        setActiveId(created.id)
        setNewName('')
      } catch (err) {
        setError(err instanceof Error ? err.message : t('teacher.createFail'))
      }
    },
    [newName, t],
  )

  async function onDeleteClass(id: string) {
    if (!confirm(t('teacher.deleteConfirm'))) return
    try {
      await api.deleteClass(id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teacher.deleteFail'))
    }
  }

  function handleExport() {
    if (!activeLegacy) return
    downloadClassAchievementsReport(activeLegacy, `ten_${activeLegacy.name}`)
  }

  async function handleLetter() {
    if (!activeLegacy) return
    const row = activeLegacy.students.find((s) => s.id === letterStudentId)
    if (!row) {
      setLetterMeta(t('teacher.pickFirst'))
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
      const data = (await readJsonResponse<{ letter?: string; source?: string }>(res)) as {
        letter?: string
        source?: string
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setLetterText(data.letter ?? '')
      setLetterMeta(data.source === 'gemini' ? t('teacher.gemini') : t('teacher.fallbackLetter'))
    } catch (err) {
      setLetterMeta(err instanceof Error ? err.message : t('teacher.reqFail'))
    } finally {
      setLetterLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-pathwise-line bg-white p-6 shadow-sm" aria-labelledby="teacher-dash-title">
        <h2 id="teacher-dash-title" className="text-lg font-semibold text-pathwise-ink">
          {t('teacher.dash')}
        </h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          {t('teacher.dashHint')}
        </p>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t('teacher.ariaClasses')}>
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === activeServerClass?.id}
              onClick={() => setActiveId(c.id)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                c.id === activeServerClass?.id
                  ? 'bg-[#6C63FF] text-white shadow-sm'
                  : 'bg-white text-pathwise-ink ring-1 ring-pathwise-line hover:bg-white'
              }`}
            >
              {c.name}
            </button>
          ))}
          {classes.length === 0 && (
            <p className="text-sm text-pathwise-muted">{t('teacher.noClasses')}</p>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={onCreateClass}
            className="rounded-2xl border border-dashed border-pathwise-line bg-white p-4"
            aria-label={t('teacher.ariaCreate')}
          >
            <h3 className="text-sm font-semibold text-pathwise-ink">{t('teacher.newClass')}</h3>
            <label htmlFor="new-class-name" className="mt-3 block text-xs font-medium text-pathwise-muted">
              {t('teacher.className')}
            </label>
            <input
              id="new-class-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="pw-input mt-1 w-full px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="pw-btn-primary mt-4 inline-flex min-h-[48px] items-center justify-center px-4 py-2 text-sm"
            >
              {t('teacher.create')}
            </button>
            <p className="mt-2 text-xs text-pathwise-muted">
              {t('teacher.createHint')}
            </p>
          </form>

          {activeServerClass ? (
            <div className="rounded-2xl border border-[#6C63FF]/30 bg-[#6C63FF]/10 p-4">
              <h3 className="text-sm font-semibold text-pathwise-ink">{t('teacher.current')}</h3>
              <p className="mt-2 text-sm text-pathwise-muted">{t('teacher.nameField')}</p>
              <p className="text-base font-semibold text-pathwise-ink">{activeServerClass.name}</p>
              <p className="mt-4 text-sm text-pathwise-muted">{t('teacher.inviteCode')}</p>
              <p
                className="mt-1 font-mono text-2xl font-bold tracking-widest text-pathwise-ink"
                aria-live="polite"
              >
                {activeServerClass.inviteCode}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(activeServerClass.inviteCode)
                  }}
                  className="text-sm font-medium text-pathwise-accent underline-offset-2 hover:underline"
                >
                  {t('teacher.copy')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteClass(activeServerClass.id)}
                  className="rounded-lg border border-[#FF6B6B]/30 px-2 py-1 text-xs font-medium text-red-700 hover:bg-[#FF6B6B]/10"
                >
                  {t('teacher.delete')}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-pathwise-line bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-pathwise-ink">{t('teacher.inviteCode')}</h3>
              <p className="mt-2 text-sm text-pathwise-muted">
                {t('teacher.inviteEmpty')}
              </p>
            </div>
          )}
        </div>
      </section>

      {activeLegacy && (
        <section
          className="pw-card p-6"
          aria-labelledby="class-table-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="class-table-title" className="text-lg font-semibold text-pathwise-ink">
                {t('teacher.summary')}
              </h2>
              <p className="mt-1 text-sm text-pathwise-muted">
                {t('teacher.summaryHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d7d3ff] bg-[#f1efff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ebe9ff]"
            >
              {t('teacher.export')}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 ring-1 ring-pathwise-line">
            <table className="min-w-full divide-y divide-pathwise-line text-left text-sm">
              <thead className="bg-white text-xs font-semibold uppercase text-pathwise-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    {t('teacher.col.student')}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t('teacher.col.onboard')}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t('teacher.col.tracks')}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t('teacher.col.aid')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pathwise-line bg-transparent">
                {activeLegacy.students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-pathwise-muted">
                      {t('teacher.emptyRoster', { code: activeLegacy.inviteCode })}
                    </td>
                  </tr>
                ) : (
                  activeLegacy.students.map((s) => <StudentTableRow key={s.id} row={s} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeLegacy && (
        <section
          className="pw-card p-6"
          aria-labelledby="rec-letter-title"
        >
          <h2 id="rec-letter-title" className="text-lg font-semibold text-pathwise-ink">
            {t('teacher.letter')}
          </h2>
          <p className="mt-1 text-sm text-pathwise-muted">
            {t('teacher.letterHint')}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="letter-student" className="text-sm font-medium text-pathwise-ink">
                {t('teacher.pickStudent')}
              </label>
              <select
                id="letter-student"
                value={letterStudentId}
                onChange={(e) => setLetterStudentId(e.target.value)}
                className="pw-input mt-2 w-full px-3 py-3 text-sm"
              >
                <option value="">{t('teacher.pick')}</option>
                {activeLegacy.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.profile.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-sm font-medium text-pathwise-ink">{t('teacher.letterLang')}</span>
              <fieldset className="mt-2 flex flex-wrap gap-3">
                {(['kk', 'ru', 'en'] as const).map((code) => (
                  <label
                    key={code}
                    className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-pathwise-line px-4 py-2 text-sm has-[:checked]:border-[#6C63FF] has-[:checked]:bg-[#6C63FF]/20"
                  >
                    <input
                      type="radio"
                      name="letter-lang"
                      value={code}
                      checked={letterLang === code}
                      onChange={() => setLetterLang(code)}
                    />
                    {t(`teacher.lang.${code}`)}
                  </label>
                ))}
              </fieldset>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLetter}
            disabled={letterLoading || !letterStudentId}
            className="pw-btn-primary mt-4 inline-flex min-h-[48px] items-center justify-center px-5 py-3 text-sm disabled:opacity-50"
          >
            {letterLoading ? t('teacher.generating') : t('teacher.generate')}
          </button>
          {letterMeta && <p className="mt-2 text-xs text-pathwise-muted">{letterMeta}</p>}
          {letterText && (
            <pre
              className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-100"
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
  const { t } = useI18n()
  return (
    <tr className="hover:bg-white">
      <td className="px-4 py-3 font-medium text-pathwise-ink">{row.profile.displayName}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.onboardingComplete ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {row.onboardingComplete ? t('teacher.onboardOk') : t('teacher.onboardNo')}
        </span>
      </td>
      <td className="max-w-xs px-4 py-3 text-pathwise-muted">
        {row.careerDirections.filter(Boolean).join(' · ') || '—'}
      </td>
      <td className="px-4 py-3">
        {row.needsFinancialHelp ? (
          <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-900">
            {t('teacher.needsAid')}
          </span>
        ) : (
          <span className="text-xs text-pathwise-muted">{t('teacher.noAid')}</span>
        )}
      </td>
    </tr>
  )
}
