'use client'

import { TeacherDashboard } from '../components/TeacherDashboard'
import { PortalPageHero } from '../components/PortalPageHero'

export function TeachersPage() {
  return (
    <>
      <PortalPageHero
        kicker="Учителя"
        title="Класс, рекомендации и отчётность"
        description="Инвайт-коды, свод по ученикам, рекомендательные письма через Gemini и CSV для директора в едином кабинете."
        stats={[
          { value: 'Класс', label: 'управление' },
          { value: 'AI', label: 'письма' },
          { value: 'CSV', label: 'экспорт' },
        ]}
      />
      <TeacherDashboard />
    </>
  )
}
