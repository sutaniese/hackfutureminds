'use client'

import { EnterpriseHub } from '../components/EnterpriseHub'
import { PortalPageHero } from '../components/PortalPageHero'

export function EnterprisePage() {
  return (
    <>
      <div
        role="status"
        className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <strong>Не живое демо.</strong> Цифры 524 учеников и 128,4 млн ₸ — макет «для защиты», не
        данные класса. Живой путь: кабинет учителя → обучение → код приглашения.
      </div>
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
