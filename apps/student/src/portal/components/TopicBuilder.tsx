import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'
import { localizedCount } from '@/lib/i18n-labels'
import { SUBJECTS, subjectTitle } from '@/lib/learning/catalog'
import {
  deleteCustomTopic,
  readCustomTopics,
  saveCustomTopic,
  subscribeLearning,
} from '@/lib/learning/store'
import type { Difficulty, Grade, Task, Topic } from '@/lib/learning/types'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { deleteCustomTopicRemote, listClassesRemote, publishCustomTopic } from '@/lib/learning/remote'

const GRADES: Grade[] = [7, 8, 9, 10, 11, 12]

type DraftTask = {
  key: string
  prompt: string
  options: string[]
  answerIndex: number
  explanation: string
  difficulty: Difficulty
  skill: string
}

function emptyTask(index: number): DraftTask {
  return {
    key: `draft-${index}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: '',
    options: ['', '', '', ''],
    answerIndex: 0,
    explanation: '',
    difficulty: 1,
    skill: '',
  }
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'h', һ: 'h',
  ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', і: 'i', ь: '', э: 'e',
  ю: 'yu', я: 'ya',
}

/** ASCII-слаг: id темы попадает в URL, поэтому кириллицу транслитерируем. */
function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'topic'
}

/** Конструктор тем и заданий для учителя. Контент сразу виден ученикам. */
export function TopicBuilder() {
  const { t, locale } = useI18n()
  const [custom, setCustom] = useState<Topic[]>([])
  const [subjectId, setSubjectId] = useState<string>('math')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [grades, setGrades] = useState<Grade[]>([9])
  const [skills, setSkills] = useState('')
  const [theory, setTheory] = useState('')
  const [tasks, setTasks] = useState<DraftTask[]>([emptyTask(0)])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [classes, setClasses] = useState<Array<{ id: string; name: string; inviteCode: string }>>([])
  const [classId, setClassId] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    const sync = () => setCustom(readCustomTopics())
    sync()
    return subscribeLearning(sync)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    void listClassesRemote()
      .then((list) => {
        setClasses(list)
        setClassId((prev) => prev || list[0]?.id || '')
      })
      .catch(() => undefined)
  }, [])

  const toggleGrade = useCallback((grade: Grade) => {
    setGrades((prev) =>
      prev.includes(grade) ? prev.filter((item) => item !== grade) : [...prev, grade].sort((a, b) => a - b),
    )
  }, [])

  const updateTask = useCallback((key: string, patch: Partial<DraftTask>) => {
    setTasks((prev) => prev.map((task) => (task.key === key ? { ...task, ...patch } : task)))
  }, [])

  const resetForm = useCallback(() => {
    setTitle('')
    setSummary('')
    setSkills('')
    setTheory('')
    setGrades([9])
    setTasks([emptyTask(0)])
  }, [])

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      setError(null)
      setMessage(null)

      if (!title.trim()) {
        setError(t('builder.needTitle'))
        return
      }
      if (grades.length === 0) {
        setError(t('builder.needGrade'))
        return
      }
      if (isSupabaseConfigured() && !classId) {
        setError(t('builder.needClass'))
        return
      }

      const validTasks = tasks.filter(
        (task) => task.prompt.trim() && task.options.filter((option) => option.trim()).length >= 2,
      )
      if (validTasks.length === 0) {
        setError(t('builder.needTask'))
        return
      }

      const topicId = `custom-${slugify(title)}-${Date.now().toString(36)}`
      const skillList = skills
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      const builtTasks: Task[] = validTasks.map((task, index) => {
        const options = task.options.map((option) => option.trim()).filter(Boolean)
        const answerIndex = Math.min(task.answerIndex, options.length - 1)
        return {
          id: `${topicId}-task-${index + 1}`,
          topicId,
          type: 'single',
          difficulty: task.difficulty,
          skill: task.skill.trim() || skillList[0] || title.trim(),
          prompt: task.prompt.trim(),
          options,
          answer: answerIndex,
          explanation:
            task.explanation.trim() ||
            `Правильный ответ: ${options[answerIndex]}. Разберите условие ещё раз по шагам.`,
          minutes: 3,
        }
      })

      const theoryParagraphs = theory
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean)

      const topic: Topic = {
        id: topicId,
        subjectId,
        title: title.trim(),
        grades,
        summary: summary.trim() || `Тема по предмету «${subjectTitle(subjectId)}».`,
        skills: skillList.length > 0 ? skillList : [title.trim()],
        theory:
          theoryParagraphs.length > 0
            ? theoryParagraphs
            : ['Конспект пока не заполнен — добавьте объяснение темы через панель учителя.'],
        materials: [],
        tasks: builtTasks,
        custom: true,
      }

      setPublishing(true)
      try {
        if (isSupabaseConfigured() && classId) {
          await publishCustomTopic(classId, topic)
        }
        saveCustomTopic(topic)
        setMessage(t('builder.published', { title: topic.title }))
        resetForm()
      } catch (err) {
        setError(err instanceof Error ? err.message : t('builder.publishFail'))
      } finally {
        setPublishing(false)
      }
    },
    [classId, grades, resetForm, skills, subjectId, summary, t, tasks, theory, title],
  )

  return (
    <div className="space-y-6">
      <section className="pw-card p-6">
        <h2 className="text-lg font-semibold text-pathwise-ink">{t('builder.title')}</h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          {t('builder.hint')}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="builder-subject" className="text-sm font-semibold text-pathwise-ink">
                {t('builder.subject')}
              </label>
              <select
                id="builder-subject"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                className="pw-input mt-2 w-full px-3 py-3 text-sm"
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="builder-title" className="text-sm font-semibold text-pathwise-ink">
                {t('builder.topicTitle')}
              </label>
              <input
                id="builder-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('builder.titlePh')}
                className="pw-input mt-2 w-full px-3 py-3 text-sm"
              />
            </div>
          </div>

          {isSupabaseConfigured() ? (
            <div>
              <label htmlFor="builder-class" className="text-sm font-semibold text-pathwise-ink">
                {t('builder.publishTo')}
              </label>
              <select
                id="builder-class"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="pw-input mt-2 w-full px-3 py-3 text-sm"
              >
                <option value="">{t('builder.pickClass')}</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.inviteCode})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <span className="text-sm font-semibold text-pathwise-ink">{t('builder.grades')}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {GRADES.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  aria-pressed={grades.includes(grade)}
                  className={`min-h-12 min-w-14 rounded-full border px-4 text-sm font-bold transition ${
                    grades.includes(grade)
                      ? 'border-[#6C63FF] bg-[#6C63FF] text-white'
                      : 'border-slate-200 bg-white text-pathwise-ink hover:border-[#6C63FF]/50'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="builder-summary" className="text-sm font-semibold text-pathwise-ink">
                {t('builder.summary')}
              </label>
              <input
                id="builder-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder={t('builder.summaryPh')}
                className="pw-input mt-2 w-full px-3 py-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="builder-skills" className="text-sm font-semibold text-pathwise-ink">
                {t('builder.skills')}
              </label>
              <input
                id="builder-skills"
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                placeholder={t('builder.skillsPh')}
                className="pw-input mt-2 w-full px-3 py-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="builder-theory" className="text-sm font-semibold text-pathwise-ink">
              {t('builder.theory')}
            </label>
            <p className="mt-1 text-xs text-pathwise-muted">
              {t('builder.theoryHint')}
            </p>
            <textarea
              id="builder-theory"
              value={theory}
              onChange={(event) => setTheory(event.target.value)}
              rows={6}
              placeholder={'Первый абзац конспекта.\n\nВторой абзац конспекта.'}
              className="pw-input mt-2 w-full px-3 py-3 text-sm"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-pathwise-ink">{t('builder.tasks')}</h3>
              <button
                type="button"
                onClick={() => setTasks((prev) => [...prev, emptyTask(prev.length)])}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-pathwise-ink transition hover:border-[#6C63FF]"
              >
                {t('builder.addTask')}
              </button>
            </div>

            {tasks.map((task, index) => (
              <div key={task.key} className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-pathwise-ink">{t('builder.taskN', { n: index + 1 })}</p>
                  {tasks.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setTasks((prev) => prev.filter((item) => item.key !== task.key))}
                      className="text-xs font-semibold text-[#E75555] underline-offset-2 hover:underline"
                    >
                      {t('builder.remove')}
                    </button>
                  ) : null}
                </div>

                <label htmlFor={`${task.key}-prompt`} className="mt-3 block text-xs font-semibold text-pathwise-muted">
                  {t('builder.prompt')}
                </label>
                <input
                  id={`${task.key}-prompt`}
                  value={task.prompt}
                  onChange={(event) => updateTask(task.key, { prompt: event.target.value })}
                  className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
                />

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {task.options.map((option, optionIndex) => (
                    <label
                      key={`${task.key}-option-${optionIndex}`}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
                    >
                      <input
                        type="radio"
                        name={`${task.key}-answer`}
                        checked={task.answerIndex === optionIndex}
                        onChange={() => updateTask(task.key, { answerIndex: optionIndex })}
                        className="h-4 w-4 shrink-0 accent-[#6C63FF]"
                        aria-label={t('builder.correctOption', { n: optionIndex + 1 })}
                      />
                      <input
                        value={option}
                        onChange={(event) => {
                          const options = [...task.options]
                          options[optionIndex] = event.target.value
                          updateTask(task.key, { options })
                        }}
                        placeholder={t('builder.option', { n: optionIndex + 1 })}
                        className="pw-input min-h-10 w-full px-2.5 py-1.5 text-sm"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-pathwise-muted">
                  {t('builder.markCorrect')}
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor={`${task.key}-skill`} className="block text-xs font-semibold text-pathwise-muted">
                      {t('builder.skill')}
                    </label>
                    <input
                      id={`${task.key}-skill`}
                      value={task.skill}
                      onChange={(event) => updateTask(task.key, { skill: event.target.value })}
                      placeholder={t('builder.skillPh')}
                      className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${task.key}-difficulty`} className="block text-xs font-semibold text-pathwise-muted">
                      {t('builder.diff')}
                    </label>
                    <select
                      id={`${task.key}-difficulty`}
                      value={task.difficulty}
                      onChange={(event) =>
                        updateTask(task.key, { difficulty: Number(event.target.value) as Difficulty })
                      }
                      className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
                    >
                      <option value={1}>{t('builder.diff1')}</option>
                      <option value={2}>{t('builder.diff2')}</option>
                      <option value={3}>{t('builder.diff3')}</option>
                    </select>
                  </div>
                </div>

                <label htmlFor={`${task.key}-explanation`} className="mt-3 block text-xs font-semibold text-pathwise-muted">
                  {t('builder.explain')}
                </label>
                <textarea
                  id={`${task.key}-explanation`}
                  value={task.explanation}
                  onChange={(event) => updateTask(task.key, { explanation: event.target.value })}
                  rows={2}
                  className="pw-input mt-1 w-full px-3 py-2.5 text-sm"
                />
              </div>
            ))}
          </div>

          {error ? <p className="text-sm font-semibold text-[#E75555]">{error}</p> : null}
          {message ? <p className="text-sm font-semibold text-emerald-600">{message}</p> : null}

          <button type="submit" disabled={publishing} className="pw-btn-primary text-sm disabled:opacity-50">
            {publishing ? t('builder.publishing') : t('builder.publish')}
          </button>
        </form>
      </section>

      <section className="pw-card p-6">
        <h2 className="text-lg font-semibold text-pathwise-ink">{t('builder.custom')}</h2>
        {custom.length === 0 ? (
          <p className="mt-3 text-sm text-pathwise-muted">
            {t('builder.customEmpty')}
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {custom.map((topic) => (
              <div key={topic.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-pathwise-ink">{topic.title}</p>
                  <span className="rounded-full bg-[#6C63FF]/10 px-2.5 py-1 text-[11px] font-bold text-[#554dd6]">
                    {subjectTitle(topic.subjectId)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-pathwise-muted">{topic.summary}</p>
                <p className="mt-2 text-xs font-semibold text-pathwise-muted">
                  {t('builder.gradesLine', {
                    grades: topic.grades.join(', '),
                    tasks: localizedCount(locale, 'tasks', topic.tasks.length),
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/learning/topic/${topic.id}`}
                    className="text-xs font-bold text-pathwise-accent underline-offset-2 hover:underline"
                  >
                    {t('builder.openAsStudent')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      deleteCustomTopic(topic.id)
                      if (isSupabaseConfigured()) void deleteCustomTopicRemote(topic.id)
                    }}
                    className="text-xs font-bold text-[#E75555] underline-offset-2 hover:underline"
                  >
                    {t('builder.remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
