'use client'

import { EnterpriseHub } from '../components/EnterpriseHub'
import { PortalPageHero } from '../components/PortalPageHero'

export function EnterprisePage() {
  return (
    <>
      <PortalPageHero
        kicker="Enterprise"
        title="White-label платформа для ЕНТ-центров"
        description="Брендинг, грантовый ROI, CRM sync и массовые отчёты для родителей в одном аккуратном интерфейсе."
        stats={[
          { value: '500+', label: 'учеников' },
          { value: 'ROI', label: 'аналитика' },
          { value: 'CRM', label: 'интеграция' },
        ]}
      />
      <EnterpriseHub />
    </>
  )
}
