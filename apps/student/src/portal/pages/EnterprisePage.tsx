'use client'

import { EnterpriseHub } from '../components/EnterpriseHub'
import { PortalPageHero } from '../components/PortalPageHero'

export function EnterprisePage() {
  return (
    <>
      <PortalPageHero
        kicker="Enterprise"
        title="White-label платформа для ЕНТ-центров"
        description="Брендинг кабинета под партнёра: цвета, логотип и название центра."
      />
      <EnterpriseHub />
    </>
  )
}
