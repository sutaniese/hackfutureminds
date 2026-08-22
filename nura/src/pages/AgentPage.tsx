import { AgentChat } from '../components/AgentChat'
import { StudentNotesPanel } from '../components/StudentNotesPanel'
import { useStudents } from '../state/StudentContext'

export function AgentPage() {
  const { activeStudent } = useStudents()
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-pathwise-ink md:text-3xl">AI-наставник</h1>
        <p className="mt-2 max-w-3xl text-sm text-pathwise-muted">
          Персональный агент на Gemini, который помнит ученика. Контекст — markdown-vault в стиле Obsidian
          (<code className="rounded bg-slate-100 px-1">ten-vault/</code>): профиль, гранты, заметки.
        </p>
      </div>

      <AgentChat />

      {activeStudent && <StudentNotesPanel studentId={activeStudent.id} />}
    </>
  )
}
