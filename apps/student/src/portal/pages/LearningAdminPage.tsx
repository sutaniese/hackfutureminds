'use client'

import { useState } from 'react'
import { ClassLearningDashboard } from '../components/ClassLearningDashboard'
import { TopicBuilder } from '../components/TopicBuilder'
import { PortalPageHero } from '../components/PortalPageHero'

type Tab = 'progress' | 'builder'

const TABS: { id: Tab; label: string }[] = [
  { id: 'progress', label: 'Прогресс класса' },
  { id: 'builder', label: 'Конструктор материалов' },
]

export function LearningAdminPage() {
  const [tab, setTab] = useState<Tab>('progress')

  return (
    <>
      <PortalPageHero
        kicker="Обучение"
        title="Панель учителя: прогресс и материалы"
        description="Свод по классу из диагностики и решённых заданий, проблемные темы и конструктор, через который можно добавить свою тему с заданиями."
        stats={[
          { value: 'Класс', label: 'прогресс' },
          { value: 'CSV', label: 'выгрузка' },
          { value: 'Темы', label: 'конструктор' },
        ]}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Разделы панели обучения">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-12 rounded-full px-5 text-sm font-bold transition ${
              tab === item.id
                ? 'bg-[#6C63FF] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-pathwise-ink hover:border-[#6C63FF]/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'progress' ? <ClassLearningDashboard /> : <TopicBuilder />}
    </>
  )
}
