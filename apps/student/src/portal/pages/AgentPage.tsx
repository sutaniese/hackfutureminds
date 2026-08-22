'use client'

import { AgentChat } from '../components/AgentChat'
import { PortalPageHero } from '../components/PortalPageHero'
import { StudentNotesPanel } from '../components/StudentNotesPanel'
import { useStudents } from '../state/StudentContext'

export function AgentPage() {
  const { activeStudent } = useStudents()
  return (
    <>
      <PortalPageHero
        kicker="AI-наставник"
        title="Персональный агент, который помнит ученика"
        description="Gemini-агент работает с профилем, грантами и заметками в ten-vault, чтобы помогать семье и школе принимать решения быстрее."
        stats={[
          { value: '1', label: 'активный профиль' },
          { value: '24/7', label: 'чат-помощник' },
          { value: 'Vault', label: 'память ученика' },
        ]}
      />

      <AgentChat />

      {activeStudent && <StudentNotesPanel studentId={activeStudent.id} />}
    </>
  )
}
