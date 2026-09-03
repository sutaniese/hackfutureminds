'use client'

import { useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { ClassLearningDashboard } from '../components/ClassLearningDashboard'
import { TopicBuilder } from '../components/TopicBuilder'
import { PortalPageHero } from '../components/PortalPageHero'

type Tab = 'progress' | 'builder'

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'progress', labelKey: 'learnAdmin.tab.progress' },
  { id: 'builder', labelKey: 'learnAdmin.tab.builder' },
]

export function LearningAdminPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('progress')

  return (
    <>
      <PortalPageHero
        kicker={t('learnAdmin.kicker')}
        title={t('learnAdmin.title')}
        description={t('learnAdmin.desc')}
        stats={[
          { value: t('teacher.classes'), label: t('learnAdmin.statProgress') },
          { value: 'CSV', label: t('learnAdmin.statCsv') },
          { value: t('nav.teacherLearn'), label: t('learnAdmin.statTopics') },
        ]}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('learnAdmin.tabsAria')}>
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
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'progress' ? <ClassLearningDashboard /> : <TopicBuilder />}
    </>
  )
}
