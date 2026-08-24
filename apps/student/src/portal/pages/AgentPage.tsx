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
        description="AI-наставник отвечает по профилю ученика: результаты, прогресс, гранты и заметки. Учитель может спросить, как дела у класса и где нужны пробелы."
        stats={[
          { value: '1', label: 'активный профиль' },
          { value: '24/7', label: 'чат-помощник' },
          { value: 'Память', label: 'результаты ученика' },
        ]}
      />

      <AgentChat />

      {activeStudent && <StudentNotesPanel studentId={activeStudent.id} />}
    </>
  )
}
