import { useState } from 'react'
import { StudentEditor } from '../components/StudentEditor'
import { api } from '../lib/api'
import { useStudents } from '../state/StudentContext'

export function StudentsPage() {
  const { students, loading, error, activeStudentId, setActiveStudentId, removeLocal, reload } = useStudents()
  const [mode, setMode] = useState<'edit' | 'new'>('edit')

  async function handleDelete(id: string) {
    if (!confirm('Удалить ученика и его vault-папку?')) return
    await api.deleteStudent(id)
    removeLocal(id)
    await reload()
  }

  return (
    <>
      <div className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-pathwise-ink md:text-3xl">Ученики</h1>
        <p className="mt-2 max-w-3xl text-sm text-pathwise-muted">
          Онбординг и редактирование учеников. Данные пишутся в локальный JSON-store и Obsidian-vault.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('new')}
              className="min-h-[40px] flex-1 rounded-xl bg-pathwise-ink px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              + Новый ученик
            </button>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="min-h-[40px] rounded-xl border border-pathwise-line px-3 py-2 text-sm font-medium text-pathwise-ink hover:bg-pathwise-accentSoft/50"
            >
              Редактировать
            </button>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-pathwise-muted">Список</p>
          {loading && <p className="mt-2 text-sm text-pathwise-muted">Загрузка…</p>}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <ul className="mt-2 space-y-1">
            {students.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStudentId(s.id)
                    setMode('edit')
                  }}
                  className={`flex-1 rounded-xl px-3 py-2 text-left text-sm ${
                    s.id === activeStudentId
                      ? 'bg-pathwise-accentSoft font-semibold text-pathwise-ink'
                      : 'hover:bg-pathwise-accentSoft/50'
                  }`}
                >
                  <div className="font-medium text-pathwise-ink">{s.displayName}</div>
                  <div className="text-xs text-pathwise-muted">
                    {s.city || '—'} · {s.language?.toUpperCase()}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  aria-label={`Удалить ${s.displayName}`}
                >
                  ✕
                </button>
              </li>
            ))}
            {students.length === 0 && !loading && (
              <li className="rounded-xl bg-pathwise-surface px-3 py-4 text-sm text-pathwise-muted">
                Учеников пока нет. Создайте первого.
              </li>
            )}
          </ul>
        </aside>

        <div>
          <StudentEditor
            studentId={mode === 'edit' ? activeStudentId : null}
            onSaved={() => setMode('edit')}
          />
        </div>
      </div>
    </>
  )
}
