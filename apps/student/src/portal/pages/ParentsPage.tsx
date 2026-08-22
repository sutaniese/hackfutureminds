'use client'

import { useRef, useState } from 'react'
import { CareerComparison } from '../components/CareerComparison'
import { FinancialCalculator } from '../components/FinancialCalculator'
import { ParentDashboard } from '../components/ParentDashboard'
import { PortalPageHero } from '../components/PortalPageHero'
import { downloadParentReportPdf } from '../lib/exportParentReportPdf'
import { useStudents } from '../state/StudentContext'

export function ParentsPage() {
  const { students, activeStudent, activeStudentId, setActiveStudentId, loading, error } = useStudents()
  const reportRef = useRef<HTMLDivElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  async function handlePdf() {
    const el = reportRef.current
    if (!el || !activeStudent) return
    setPdfBusy(true)
    try {
      await downloadParentReportPdf(el, activeStudent.displayName)
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <>
      <PortalPageHero
        kicker="Родители"
        title="Понятная картина выбора и бюджета"
        description="Профиль ребёнка, калькулятор финансового разрыва, сравнение профессий через Gemini и аккуратный PDF-отчёт для семьи."
        stats={[
          { value: String(students.length), label: 'учеников' },
          { value: activeStudent ? 'PDF' : '—', label: 'семейный отчёт' },
          { value: 'ROI', label: 'финансовый маршрут' },
        ]}
      />

      <div className="pw-card flex flex-wrap items-end gap-4 p-4 md:p-5">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="parent-student" className="text-sm font-medium text-pathwise-ink">
            Ученик
          </label>
          <select
            id="parent-student"
            value={activeStudentId ?? ''}
            onChange={(e) => setActiveStudentId(e.target.value || null)}
            className="mt-2 w-full rounded-xl border border-pathwise-line bg-white/90 px-3 py-3 text-sm font-medium shadow-sm focus:border-pathwise-accent"
          >
            <option value="">— выберите —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName} ({s.id})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handlePdf}
          disabled={!activeStudent || pdfBusy}
          className="pw-primary-btn pw-focus px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pdfBusy ? 'Сборка PDF…' : 'Скачать PDF-отчёт'}
        </button>
      </div>

      {loading && <p className="text-sm text-pathwise-muted">Загрузка…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div
        id="parent-report-root"
        ref={reportRef}
        className="space-y-8 rounded-[1.6rem] border border-dashed border-pathwise-line bg-white/45 p-4 shadow-sm backdrop-blur md:p-6"
      >
        <ParentDashboard student={activeStudent ?? null} />
        {activeStudent && (
          <FinancialCalculator
            monthlyNeedKzt={activeStudent.financial_route.monthly_cost}
            grants={activeStudent.financial_route.grants}
            studentName={activeStudent.displayName}
          />
        )}
        {activeStudent && <CareerComparison childProfession={activeStudent.primaryCareerTitle} />}
      </div>
    </>
  )
}
