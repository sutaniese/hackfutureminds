'use client'

import { useI18n } from '@/i18n/I18nProvider'
import { AgentChat } from '../components/AgentChat'
import { PortalPageHero } from '../components/PortalPageHero'
import { StudentNotesPanel } from '../components/StudentNotesPanel'
import { useStudents } from '../state/StudentContext'

export function AgentPage() {
  const { t } = useI18n()
  const { activeStudent } = useStudents()
  return (
    <>
      <PortalPageHero
        kicker={t('agent.pageKicker')}
        title={t('agent.pageTitle')}
        description={t('agent.pageDesc')}
        stats={[
          { value: '1', label: t('agent.statProfile') },
          { value: '24/7', label: t('agent.statChat') },
          { value: 'AI', label: t('agent.statMemory') },
        ]}
      />

      <AgentChat />

      {activeStudent && <StudentNotesPanel studentId={activeStudent.id} />}
    </>
  )
}
