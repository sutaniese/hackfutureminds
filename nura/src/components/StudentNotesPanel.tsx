import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api, type StudentNote } from '../lib/api'

type Props = {
  studentId: string
}

export function StudentNotesPanel({ studentId }: Props) {
  const [notes, setNotes] = useState<StudentNote[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      setNotes(await api.listNotes(studentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заметок')
    }
  }, [studentId])

  useEffect(() => {
    setNotes([])
    setTitle('')
    setContent('')
    if (studentId) void reload()
  }, [studentId, reload])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return
    setBusy(true)
    try {
      await api.saveNote(studentId, { title: title.trim(), content: content.trim() })
      setTitle('')
      setContent('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(name: string) {
    setBusy(true)
    try {
      await api.deleteNote(studentId, name)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="notes-panel-title"
    >
      <header className="border-b border-slate-100 pb-4">
        <h3 id="notes-panel-title" className="text-lg font-semibold text-pathwise-ink">
          Obsidian-заметки ученика
        </h3>
        <p className="text-xs text-pathwise-muted">
          Файлы сохраняются в <code className="rounded bg-slate-100 px-1">ten-vault/students/{studentId}/notes/</code>.
          Их видит и AI-агент.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок (станет именем .md)"
          className="min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pathwise-accent"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Текст заметки в markdown"
          rows={4}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pathwise-accent"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="min-h-[40px] rounded-xl bg-pathwise-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? 'Сохраняю…' : 'Сохранить заметку'}
          </button>
          <button
            type="button"
            onClick={reload}
            disabled={busy}
            className="min-h-[40px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-pathwise-muted hover:bg-slate-50"
          >
            Обновить список
          </button>
          {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>
      </form>

      <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {notes.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-pathwise-muted">Заметок пока нет.</li>
        ) : (
          notes.map((n) => (
            <li key={n.fileName} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-[200px] flex-1">
                <p className="font-semibold text-pathwise-ink">{n.title}</p>
                <p className="font-mono text-xs text-pathwise-muted">{n.fileName}</p>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">
                  {n.content}
                </pre>
              </div>
              <button
                type="button"
                onClick={() => onDelete(n.fileName)}
                className="min-h-[36px] rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Удалить
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
