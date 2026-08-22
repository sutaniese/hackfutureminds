'use client'

import { useState } from 'react'
import { StudentEditor } from '../components/StudentEditor'
import { PortalPageHero } from '../components/PortalPageHero'
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
      <PortalPageHero
        kicker="Ученики"
        title="Профили, планы и заметки в одном месте"
        description="Создавайте учеников, редактируйте карьерные данные и храните контекст в локальном JSON-store и ten-vault."
        stats={[
          { value: String(students.length), label: 'профилей' },
          { value: activeStudentId ? '1' : '0', label: 'выбран' },
          { value: 'Vault', label: 'контекст' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="pw-card p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('new')}
              className="pw-primary-btn pw-focus min-h-[40px] flex-1 px-3 py-2 text-sm"
            >
              + Новый ученик
            </button>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="pw-secondary-btn pw-focus min-h-[40px] rounded-xl px-3 py-2 text-sm"
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
                  className={`flex-1 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    s.id === activeStudentId
                      ? 'bg-pathwise-accentSoft font-semibold text-pathwise-ink ring-1 ring-pathwise-accent'
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
