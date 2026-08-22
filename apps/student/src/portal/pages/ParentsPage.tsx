'use client'

import { useRef, useState } from 'react'
import { CareerComparison } from '../components/CareerComparison'
import { FinancialCalculator } from '../components/FinancialCalculator'
import { ParentDashboard } from '../components/ParentDashboard'
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
      <div className="rounded-2xl border border-pathwise-line bg-pathwise-surface p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-pathwise-ink md:text-3xl">Родители</h1>
        <p className="mt-2 max-w-3xl text-sm text-pathwise-muted">
          Профиль ребёнка только для чтения, калькулятор разрыва, сравнение профессий (Gemini), PDF для семьи.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-pathwise-line bg-pathwise-surface p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="parent-student" className="text-sm font-medium text-pathwise-ink">
            Ученик
          </label>
          <select
            id="parent-student"
            value={activeStudentId ?? ''}
            onChange={(e) => setActiveStudentId(e.target.value || null)}
            className="mt-2 w-full rounded-xl border border-pathwise-line px-3 py-3 text-sm font-medium focus:border-pathwise-accent"
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
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-pathwise-ink px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pdfBusy ? 'Сборка PDF…' : 'Скачать PDF-отчёт'}
        </button>
      </div>

      {loading && <p className="text-sm text-pathwise-muted">Загрузка…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div
        id="parent-report-root"
        ref={reportRef}
        className="space-y-8 rounded-2xl border border-dashed border-pathwise-line bg-pathwise-surface/50 p-4 md:p-6"
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
