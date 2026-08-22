import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { subjectTitle } from '@/lib/learning/catalog'
import {
  LEVEL_LABELS,
  readAllTopics,
  readClassRoster,
  subscribeLearning,
  type StudentLearningSnapshot,
} from '@/lib/learning/store'
import type { Topic } from '@/lib/learning/types'
import { studentsLabel } from '@/lib/learning/plural'
import { downloadLearningProgressReport } from '../lib/exportLearningProgress'

function levelTone(level: 1 | 2 | 3 | 4) {
  if (level >= 4) return 'bg-emerald-100 text-emerald-900'
  if (level === 3) return 'bg-[#6C63FF]/15 text-[#4b44b8]'
  if (level === 2) return 'bg-amber-100 text-amber-900'
  return 'bg-rose-100 text-rose-900'
}

function Bar({ value, color }: { value: number; color: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${safe}%`, backgroundColor: color }} />
    </div>
  )
}

/** Свод по обучению класса: агрегаты, проблемные темы и таблица учеников. */
export function ClassLearningDashboard() {
  const [roster, setRoster] = useState<StudentLearningSnapshot[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  useEffect(() => {
    const sync = () => {
      setRoster(readClassRoster())
      setTopics(readAllTopics())
    }
    sync()
    return subscribeLearning(sync)
  }, [])

  const filtered = useMemo(
    () => (subjectFilter === 'all' ? roster : roster.filter((s) => s.subjectId === subjectFilter)),
    [roster, subjectFilter],
  )

  const subjects = useMemo(
    () => Array.from(new Set(roster.map((student) => student.subjectId))),
    [roster],
  )

  const stats = useMemo(() => {
    const count = filtered.length || 1
    return {
      total: filtered.length,
      avgMastery: Math.round(filtered.reduce((sum, s) => sum + s.mastery, 0) / count),
      avgAccuracy: Math.round(filtered.reduce((sum, s) => sum + s.accuracy, 0) / count),
      atRisk: filtered.filter((s) => s.accuracy < 60).length,
      diagnosed: filtered.filter((s) => s.solvedTasks > 0 || s.accuracy > 0).length,
    }
  }, [filtered])

  const weakTopics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const student of filtered) {
      for (const topicId of student.weakTopics) {
        counts.set(topicId, (counts.get(topicId) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([topicId, count]) => ({
        topicId,
        count,
        title: topics.find((topic) => topic.id === topicId)?.title ?? topicId,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [filtered, topics])

  const levelSpread = useMemo(() => {
    const spread: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const student of filtered) spread[student.level] += 1
    return spread
  }, [filtered])

  return (
    <div className="space-y-6">
      <section className="pw-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-pathwise-ink">Учебный прогресс класса</h2>
            <p className="mt-1 text-sm text-pathwise-muted">
              Данные собираются из диагностики и решённых заданий каждого ученика.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="subject-filter" className="sr-only">
              Фильтр по предмету
            </label>
            <select
              id="subject-filter"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="pw-input px-3 py-2 text-sm"
            >
              <option value="all">Все предметы</option>
              {subjects.map((id) => (
                <option key={id} value={id}>
                  {subjectTitle(id)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => downloadLearningProgressReport(filtered, topics)}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-pathwise-ink transition hover:border-[#6C63FF]"
            >
              Выгрузить CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Учеников', value: String(stats.total), tone: 'text-pathwise-ink' },
            { label: 'Среднее освоение', value: `${stats.avgMastery}%`, tone: 'text-[#6C63FF]' },
            { label: 'Средняя точность', value: `${stats.avgAccuracy}%`, tone: 'text-emerald-600' },
            { label: 'В зоне риска', value: String(stats.atRisk), tone: 'text-[#E75555]' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                {item.label}
              </p>
              <p className={`mt-1 text-2xl font-black tracking-tight ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-pathwise-ink">Распределение по уровням</p>
            <div className="mt-4 grid gap-2.5">
              {([4, 3, 2, 1] as const).map((level) => {
                const count = levelSpread[level]
                const percent = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-bold text-pathwise-muted">
                      {LEVEL_LABELS[level]}
                    </span>
                    <Bar
                      value={percent}
                      color={level >= 3 ? '#43D19E' : level === 2 ? '#6C63FF' : '#FF6B6B'}
                    />
                    <span className="w-8 shrink-0 text-right text-xs font-black text-pathwise-ink">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-pathwise-ink">Проблемные темы класса</p>
            {weakTopics.length === 0 ? (
              <p className="mt-3 text-sm text-pathwise-muted">
                Слабых тем пока нет — либо ученики ещё не проходили диагностику.
              </p>
            ) : (
              <div className="mt-4 grid gap-2.5">
                {weakTopics.map((topic) => (
                  <div key={topic.topicId} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-xs font-bold text-pathwise-ink">
                      {topic.title}
                    </span>
                    <Bar value={(topic.count / Math.max(1, stats.total)) * 100} color="#FF6B6B" />
                    <span className="w-16 shrink-0 text-right text-xs font-bold text-pathwise-muted">
                      {studentsLabel(topic.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="pw-card p-6">
        <h2 className="text-lg font-semibold text-pathwise-ink">Ученики</h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          Демо-ученики помечены отдельно — реальные аккаунты попадают в таблицу после диагностики.
        </p>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50">
          <table className="min-w-full divide-y divide-pathwise-line text-left text-sm">
            <thead className="bg-white text-xs font-semibold uppercase text-pathwise-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Ученик</th>
                <th scope="col" className="px-4 py-3">Класс</th>
                <th scope="col" className="px-4 py-3">Предмет</th>
                <th scope="col" className="px-4 py-3">Уровень</th>
                <th scope="col" className="px-4 py-3">Освоено</th>
                <th scope="col" className="px-4 py-3">Точность</th>
                <th scope="col" className="px-4 py-3">Слабые темы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pathwise-line bg-transparent">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-pathwise-muted">
                    По этому фильтру учеников нет.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.email} className="hover:bg-white">
                    <td className="px-4 py-3">
                      <span className="font-medium text-pathwise-ink">
                        {student.name || student.email}
                      </span>
                      {student.demo ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                          демо
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-pathwise-muted">{student.grade}</td>
                    <td className="px-4 py-3 text-pathwise-muted">
                      {subjectTitle(student.subjectId)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${levelTone(student.level)}`}
                      >
                        {LEVEL_LABELS[student.level]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bar value={student.mastery} color="#6C63FF" />
                        <span className="w-10 shrink-0 text-xs font-bold text-pathwise-ink">
                          {student.mastery}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-bold ${
                          student.accuracy >= 70
                            ? 'text-emerald-600'
                            : student.accuracy >= 50
                              ? 'text-amber-600'
                              : 'text-[#E75555]'
                        }`}
                      >
                        {student.accuracy}%
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-pathwise-muted">
                      {student.weakTopics.length === 0
                        ? '—'
                        : student.weakTopics
                            .map((id) => topics.find((topic) => topic.id === id)?.title ?? id)
                            .join(', ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-pathwise-muted">
          Ученик видит те же данные в своём кабинете —{' '}
          <Link href="/learning" className="font-semibold text-pathwise-accent underline-offset-2 hover:underline">
            раздел «Обучение»
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
