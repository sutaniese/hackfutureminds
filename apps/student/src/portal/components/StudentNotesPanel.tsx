import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api, type StudentNote } from '../lib/api'

type Props = {
  studentId: string
}

export function StudentNotesPanel({ studentId }: Props) {
  const [notes, setNotes] = useState<StudentNote[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const notes = await api.listNotes(studentId)
      setNotes(Array.isArray(notes) ? notes : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заметок')
    }
  }, [studentId])

  useEffect(() => {
    setNotes([])
    setTitle('')
    setContent('')
    setFileName('')
    if (studentId) void reload()
  }, [studentId, reload])

  async function onFileSelected(file: File | undefined) {
    if (!file) return
    setError(null)
    setFileName(file.name)
    setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''))

    try {
      const textLike =
        file.type.startsWith('text/') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.csv')

      if (textLike) {
        setContent(await file.text())
        return
      }

      const dataUrl = await readFileAsDataUrl(file)
      setContent(
        [
          `# ${file.name}`,
          '',
          `Attached file for student profile.`,
          '',
          `- Original name: ${file.name}`,
          `- Type: ${file.type || 'unknown'}`,
          `- Size: ${(file.size / 1024).toFixed(1)} KB`,
          '',
          `Data URL preview:`,
          dataUrl,
        ].join('\n'),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось прочитать файл')
      setFileName('')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return
    setBusy(true)
    try {
      await api.saveNote(studentId, { title: title.trim(), content: content.trim() })
      setTitle('')
      setContent('')
      setFileName('')
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
      className="rounded-2xl border border-pathwise-line bg-white p-6 shadow-sm"
      aria-labelledby="notes-panel-title"
    >
      <header className="border-b border-pathwise-line pb-4">
        <h3 id="notes-panel-title" className="text-lg font-semibold text-pathwise-ink">
          Заметки по ученику
        </h3>
        <p className="text-xs text-pathwise-muted">
          Заметки попадают в память AI-наставника: прогресс, результаты и договорённости с учеником.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <label className="rounded-2xl border border-dashed border-[#d7d3ff] bg-[#f7f6ff] p-4">
          <span className="block text-sm font-semibold text-pathwise-ink">
            Прикрепить файл ученика
          </span>
          <span className="mt-1 block text-xs leading-5 text-pathwise-muted">
            Можно выбрать .md/.txt как текст или любой небольшой PDF/изображение/документ как вложение заметки.
          </span>
          <input
            type="file"
            onChange={(event) => onFileSelected(event.target.files?.[0])}
            className="mt-3 block w-full rounded-xl border border-pathwise-line bg-white px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[#6C63FF] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
          />
          {fileName ? (
            <span className="mt-2 block text-xs font-semibold text-[#554dd6]">
              Выбран файл: {fileName}
            </span>
          ) : null}
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок (станет именем .md)"
          className="min-h-[44px] rounded-xl border border-pathwise-line px-3 py-2 text-sm focus:border-pathwise-accent"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Текст заметки в markdown"
          rows={4}
          className="rounded-xl border border-pathwise-line px-3 py-2 text-sm focus:border-pathwise-accent"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="min-h-[40px] rounded-xl bg-pathwise-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Сохраняю…' : 'Сохранить заметку'}
          </button>
          <button
            type="button"
            onClick={reload}
            disabled={busy}
            className="min-h-[40px] rounded-xl border border-pathwise-line px-4 py-2 text-sm font-medium text-pathwise-muted hover:bg-[#f1efff]"
          >
            Обновить список
          </button>
          {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>
      </form>

      <ul className="mt-5 divide-y divide-pathwise-line rounded-xl border border-pathwise-line">
        {notes.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-pathwise-muted">Заметок пока нет.</li>
        ) : (
          notes.map((n) => (
            <li key={n.fileName} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-[200px] flex-1">
                <p className="font-semibold text-pathwise-ink">{n.title}</p>
                <p className="font-mono text-xs text-pathwise-muted">{n.fileName}</p>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-pathwise-accent-soft/30 p-2 text-xs">
                  {n.content}
                </pre>
              </div>
              <button
                type="button"
                onClick={() => onDelete(n.fileName)}
                className="min-h-[36px] rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-[#FF6B6B]/10"
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'))
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Файл пустой или повреждён.'))
    }
    reader.readAsDataURL(file)
  })
}
