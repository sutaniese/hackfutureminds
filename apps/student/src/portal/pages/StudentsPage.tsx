'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { StudentEditor } from '../components/StudentEditor'
import { PortalPageHero } from '../components/PortalPageHero'
import { api } from '../lib/api'
import { useStudents } from '../state/StudentContext'

export function StudentsPage() {
  const { t } = useI18n()
  const { students, loading, error, activeStudentId, setActiveStudentId, removeLocal, reload } = useStudents()
  const [mode, setMode] = useState<'edit' | 'new'>('edit')

  async function handleDelete(id: string) {
    if (!confirm(t('students.deleteConfirm'))) return
    await api.deleteStudent(id)
    removeLocal(id)
    await reload()
  }

  return (
    <>
      <PortalPageHero
        kicker={t('students.kicker')}
        title={t('students.title')}
        description={t('students.desc')}
        stats={[
          { value: String(students.length), label: t('students.statProfiles') },
          { value: activeStudentId ? '1' : '0', label: t('students.statSelected') },
          { value: 'AI', label: t('students.statMemory') },
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
              {t('students.new')}
            </button>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="pw-secondary-btn pw-focus min-h-[40px] rounded-xl px-3 py-2 text-sm"
            >
              {t('students.edit')}
            </button>
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-pathwise-muted">{t('students.list')}</p>
          {loading && <p className="mt-2 text-sm text-pathwise-muted">{t('students.loading')}</p>}
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
                      ? 'bg-pathwise-accent-soft font-semibold text-pathwise-ink ring-1 ring-pathwise-accent'
                      : 'hover:bg-[#f1efff]'
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
                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-red-100 hover:bg-[#FF6B6B]/10"
                  aria-label={t('students.deleteAria', { name: s.displayName })}
                >
                  ✕
                </button>
              </li>
            ))}
            {students.length === 0 && !loading && (
              <li className="rounded-xl bg-white px-3 py-4 text-sm text-pathwise-muted">
                {t('students.empty')}
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
