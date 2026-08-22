import { useMemo, useRef, useState } from 'react'
import { CareerComparison } from './components/CareerComparison'
import { EnterpriseHub } from './components/EnterpriseHub'
import { FinancialCalculator } from './components/FinancialCalculator'
import { ParentDashboard } from './components/ParentDashboard'
import { TeacherDashboard } from './components/TeacherDashboard'
import { DEMO_STUDENT_IDS, getStudentById } from './data/students'
import { useTenantTheme } from './enterprise/TenantThemeContext'
import { downloadParentReportPdf } from './lib/exportParentReportPdf'

type AppModule = 'parents' | 'teachers' | 'enterprise'

export default function App() {
  const { tenant } = useTenantTheme()
  const [moduleView, setModuleView] = useState<AppModule>('parents')
  const [studentId, setStudentId] = useState(DEMO_STUDENT_IDS[0] ?? '')
  const reportRef = useRef<HTMLDivElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  const student = useMemo(() => getStudentById(studentId), [studentId])

  async function handlePdf() {
    const el = reportRef.current
    if (!el || !student) return
    setPdfBusy(true)
    try {
      await downloadParentReportPdf(el, student.displayName)
    } finally {
      setPdfBusy(false)
    }
  }

  const moduleTitle =
    moduleView === 'parents'
      ? 'Родители'
      : moduleView === 'teachers'
        ? 'Учителя'
        : 'Enterprise / ЕНТ-центры'

  const moduleSubtitle =
    moduleView === 'parents'
      ? 'Родительский режим: профиль ребёнка, калькулятор разрыва, сравнение профессий, PDF для семьи.'
      : moduleView === 'teachers'
        ? 'Учительский режим: класс и код приглашения, свод по ученикам, рекомендательное письмо (Gemini), CSV для директора.'
        : 'B2B: white-label бренд, грантовый ROI, CRM sync (мок), массовые отчёты для родителей.'

  return (
    <div className="min-h-screen pb-16 pt-8">
      <header className="mx-auto max-w-5xl px-4">
        <div className="flex flex-wrap items-center gap-3">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt=""
              className="h-9 w-9 rounded-lg object-contain ring-1 ring-slate-200"
              width={36}
              height={36}
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: 'var(--pw-accent)' }}
              aria-hidden
            >
              {tenant.logoMark}
            </span>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pathwise-accent">
              PathWise · прототип модулей
            </p>
            <p className="text-[11px] text-pathwise-muted">Бренд: {tenant.displayName}</p>
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-pathwise-ink md:text-3xl">{moduleTitle}</h1>
        <p className="mt-2 max-w-3xl text-sm text-pathwise-muted">{moduleSubtitle}</p>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Разделы">
          {(
            [
              ['parents', 'Родители'],
              ['teachers', 'Учителя'],
              ['enterprise', 'Enterprise'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setModuleView(id)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold ${
                moduleView === id
                  ? 'bg-pathwise-ink text-white'
                  : 'bg-white text-pathwise-ink ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto mt-8 max-w-5xl space-y-6 px-4">
        {moduleView === 'teachers' ? (
          <TeacherDashboard />
        ) : moduleView === 'enterprise' ? (
          <EnterpriseHub />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-[200px] flex-1">
                <label htmlFor="student-id" className="text-sm font-medium text-pathwise-ink">
                  ID ученика
                </label>
                <select
                  id="student-id"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium focus:border-pathwise-accent"
                >
                  {DEMO_STUDENT_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handlePdf}
                disabled={!student || pdfBusy}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-pathwise-ink px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pdfBusy ? 'Сборка PDF…' : 'Скачать PDF-отчёт'}
              </button>
            </div>

            <div
              id="parent-report-root"
              ref={reportRef}
              className="space-y-8 rounded-2xl border border-dashed border-slate-200 bg-pathwise-surface/50 p-4 md:p-6"
            >
              <ParentDashboard student={student ?? null} />
              {student && (
                <FinancialCalculator
                  monthlyNeedKzt={student.financial_route.monthly_cost}
                  grants={student.financial_route.grants}
                  studentName={student.displayName}
                />
              )}
              {student && <CareerComparison childProfession={student.primaryCareerTitle} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
