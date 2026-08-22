import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api, type ServerStudent } from '../lib/api'
import { useStudents } from '../state/StudentContext'

type Props = {
  studentId?: string | null
  onSaved?: (s: ServerStudent) => void
}

const INTERESTS_DEFAULT = 'математика, физика, программирование'

export function StudentEditor({ studentId, onSaved }: Props) {
  const { students, upsertLocal, setActiveStudentId } = useStudents()
  const initial = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  )

  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState<number>(16)
  const [city, setCity] = useState('')
  const [language, setLanguage] = useState<'kk' | 'ru' | 'en'>('ru')
  const [target, setTarget] = useState('')
  const [interests, setInterests] = useState(INTERESTS_DEFAULT)
  const [achievements, setAchievements] = useState('')
  const [primary, setPrimary] = useState('')
  const [monthly, setMonthly] = useState<number>(120000)
  const [needsHelp, setNeedsHelp] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial) {
      setDisplayName(initial.displayName)
      setAge(initial.age)
      setCity(initial.city)
      setLanguage(initial.language)
      setTarget(initial.target_university)
      setInterests(initial.interests.join(', '))
      setAchievements(initial.achievements.join('\n'))
      setPrimary(initial.primaryCareerTitle)
      setMonthly(initial.financial_route?.monthly_cost ?? 120000)
      setNeedsHelp(!!initial.needsFinancialHelp)
    } else {
      setDisplayName('')
      setAge(16)
      setCity('')
      setLanguage('ru')
      setTarget('')
      setInterests(INTERESTS_DEFAULT)
      setAchievements('')
      setPrimary('')
      setMonthly(120000)
      setNeedsHelp(false)
    }
    setInfo(null)
    setError(null)
    setInviteCode('')
  }, [initial])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const payload: Partial<ServerStudent> = {
        id: initial?.id,
        displayName: displayName.trim() || 'Без имени',
        age: Number.isFinite(age) ? age : 16,
        city: city.trim(),
        language,
        target_university: target.trim(),
        interests: interests
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        achievements: achievements
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
        primaryCareerTitle: primary.trim(),
        needsFinancialHelp: needsHelp,
        onboardingComplete: true,
        financial_route: {
          monthly_cost: Number.isFinite(monthly) ? monthly : 0,
          grants: initial?.financial_route?.grants ?? [],
          gap: Math.max(0, (Number.isFinite(monthly) ? monthly : 0) - (initial?.financial_route?.coverage_percent ?? 0)),
          coverage_percent: initial?.financial_route?.coverage_percent ?? 0,
        },
        career_map: initial?.career_map ?? [],
        portfolio_block: initial?.portfolio_block ?? '',
      }

      const saved = await api.upsertStudent(payload)
      upsertLocal(saved)
      setActiveStudentId(saved.id)

      if (inviteCode.trim()) {
        try {
          const r = await api.joinClass(inviteCode.trim(), saved.id)
          upsertLocal(r.student)
          setInfo(`Сохранено и добавлено в класс «${r.class.name}».`)
        } catch (err) {
          setInfo(`Сохранено, но в класс не добавили: ${err instanceof Error ? err.message : 'ошибка'}`)
        }
      } else {
        setInfo('Сохранено в vault.')
      }
      onSaved?.(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm"
      aria-label={initial ? 'Редактирование ученика' : 'Онбординг нового ученика'}
    >
      <h2 className="text-lg font-semibold text-pathwise-ink">
        {initial ? `Редактировать: ${initial.displayName}` : 'Добавить нового ученика'}
      </h2>
      <p className="mt-1 text-xs text-pathwise-muted">
        Поля попадают в Obsidian-vault и становятся памятью AI-агента.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Имя">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Возраст">
          <input
            type="number"
            min={10}
            max={25}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Город">
          <input value={city} onChange={(e) => setCity(e.target.value)} className="input" />
        </Field>
        <Field label="Язык">
          <select value={language} onChange={(e) => setLanguage(e.target.value as 'kk' | 'ru' | 'en')} className="input">
            <option value="kk">Қазақша</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </Field>
        <Field label="Целевой вуз" full>
          <input value={target} onChange={(e) => setTarget(e.target.value)} className="input" />
        </Field>
        <Field label="Главное направление">
          <input value={primary} onChange={(e) => setPrimary(e.target.value)} className="input" />
        </Field>
        <Field label="Месячная стоимость учёбы (₸)">
          <input
            type="number"
            min={0}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Интересы (через запятую)" full>
          <input value={interests} onChange={(e) => setInterests(e.target.value)} className="input" />
        </Field>
        <Field label="Достижения (по строке на каждое)" full>
          <textarea
            rows={3}
            value={achievements}
            onChange={(e) => setAchievements(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Код приглашения класса (необязательно)">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="TN-XXXXXX"
            className="input font-mono"
          />
        </Field>
        <label className="mt-1 inline-flex items-center gap-2 text-sm text-pathwise-ink">
          <input type="checkbox" checked={needsHelp} onChange={(e) => setNeedsHelp(e.target.checked)} />
          Нуждается в финансовой помощи
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="min-h-[44px] rounded-xl bg-pathwise-accent px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Сохраняю…' : initial ? 'Сохранить изменения' : 'Создать и привязать'}
        </button>
        {info && <span className="text-xs text-emerald-700">{info}</span>}
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>

      <style>{`
        .input { width: 100%; min-height: 44px; border-radius: 12px; border: 1px solid var(--pw-border, #e2e8f0); padding: 0.5rem 0.75rem; font-size: 0.875rem; background: var(--pw-surface, #fff); }
        .input:focus { outline: 2px solid var(--pw-primary, var(--pw-accent)); outline-offset: 2px; }
      `}</style>
    </form>
  )
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`text-sm text-pathwise-ink ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-pathwise-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
