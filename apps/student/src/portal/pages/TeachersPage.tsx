'use client'

import { useI18n } from '@/i18n/I18nProvider'
import { TeacherDashboard } from '../components/TeacherDashboard'
import { PortalPageHero } from '../components/PortalPageHero'

export function TeachersPage() {
  const { t } = useI18n()
  return (
    <>
      <PortalPageHero
        kicker={t('teacher.pageKicker')}
        title={t('teacher.pageTitle')}
        description={t('teacher.pageDesc')}
        stats={[
          { value: t('nav.class'), label: t('teacher.statManage') },
          { value: 'AI', label: t('teacher.statLetters') },
          { value: 'CSV', label: t('teacher.statExport') },
        ]}
      />
      <TeacherDashboard />
    </>
  )
}
