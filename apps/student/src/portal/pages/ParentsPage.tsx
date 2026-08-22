'use client'

import { useRef, useState } from 'react'
import { CareerComparison } from '../components/CareerComparison'
import { FinancialCalculator } from '../components/FinancialCalculator'
import { ParentDashboard } from '../components/ParentDashboard'
import { PortalPageHero } from '../components/PortalPageHero'
import { StudentNotesPanel } from '../components/StudentNotesPanel'
import { api, type ServerStudent } from '../lib/api'
import { downloadParentReportPdf } from '../lib/exportParentReportPdf'
import { useStudents } from '../state/StudentContext'
import { readJsonResponse } from '@/lib/http-json'

export function ParentsPage() {
  const {
    students,
    activeStudent,
    activeStudentId,
    setActiveStudentId,
    loading,
    error,
    upsertLocal,
  } = useStudents()
  const reportRef = useRef<HTMLDivElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

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

  async function handleStudentFile(file: File | undefined) {
    if (!file) return
    setImportBusy(true)
    setImportMessage(null)
    setImportError(null)

    try {
      const textLike =
        file.type.startsWith('text/') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.csv')
      const imageLike = file.type.startsWith('image/')
      const [text, dataUrl] = await Promise.all([
        textLike ? file.text() : Promise.resolve(undefined),
        imageLike ? readFileAsDataUrl(file) : Promise.resolve(undefined),
      ])

      const response = await fetch('/api/extract-student-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'unknown',
          text,
          dataUrl,
        }),
      })
      type ExtractPayload = {
        student?: {
          displayName: string
          age: number
          city: string
          language: 'ru' | 'kk' | 'en'
          target_university: string
          interests: string[]
          achievements: string[]
          primaryCareerTitle: string
          portfolio_block: string
          monthly_cost: number
          needsFinancialHelp: boolean
        }
        source?: 'groq' | 'local-fallback'
        error?: string
      }
      const raw = await readJsonResponse<ExtractPayload>(response)
      if ("error" in raw && !("student" in raw)) {
        throw new Error((raw as { error: string }).error)
      }
      const parsed = raw as ExtractPayload
      if (!response.ok || !parsed.student) {
        throw new Error(parsed.error || "Groq не смог прочитать файл ученика.")
      }

      const payload = parsed
      const extracted = parsed.student
      const id = `student-${slugify(extracted.displayName)}-${Date.now().toString(36)}`
      const student: Partial<ServerStudent> = {
        id,
        displayName: extracted.displayName,
        age: extracted.age,
        city: extracted.city,
        language: extracted.language,
        target_university: extracted.target_university,
        interests: extracted.interests,
        achievements: extracted.achievements,
        primaryCareerTitle: extracted.primaryCareerTitle,
        onboardingComplete: true,
        needsFinancialHelp: extracted.needsFinancialHelp,
        financial_route: {
          monthly_cost: extracted.monthly_cost,
          grants: [],
          gap: extracted.monthly_cost,
          coverage_percent: 0,
        },
        career_map: [
          {
            title: extracted.primaryCareerTitle,
            salary: 'уточняется',
            path: 'Направление извлечено Groq из файла ученика. Для точного плана можно позже запустить student results.',
            vacancies: [],
          },
        ],
        portfolio_block: extracted.portfolio_block,
      }

      const saved = await api.upsertStudent(student)
      await api.saveNote(saved.id, {
        title: `Исходный файл: ${file.name}`,
        content: [
          `# ${file.name}`,
          '',
          `Groq source: ${payload.source || 'unknown'}`,
          `MIME: ${file.type || 'unknown'}`,
          `Size: ${(file.size / 1024).toFixed(1)} KB`,
          '',
          '## Extracted portfolio',
          extracted.portfolio_block,
          '',
          text ? '## File text' : '## File preview',
          text || dataUrl || 'Файл сохранён как источник, но текст не был доступен браузеру.',
        ].join('\n'),
      })
      upsertLocal(saved)
      setActiveStudentId(saved.id)
      setImportMessage(
        `${saved.displayName} добавлен${payload.source === 'groq' ? ' через Groq' : ' локально'}. Теперь он выбран в списке.`,
      )
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Не удалось импортировать файл.')
    } finally {
      setImportBusy(false)
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

      <section className="rounded-[1.75rem] border border-[#d7d3ff] bg-[#f8f7ff] p-4 shadow-sm md:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#554dd6]">
              Groq import
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-pathwise-ink">
              Загрузите файл ученика, и Groq создаст профиль
            </h2>
            <p className="mt-1 text-sm leading-6 text-pathwise-muted">
              Подходит для анкеты, резюме, заметок, изображения справки или описания ученика.
              После импорта ученик автоматически появится в поле “Ученик”.
            </p>
          </div>
          <label className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-[#6C63FF] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#5B54D8]">
            {importBusy ? 'Groq читает файл…' : 'Выбрать файл ученика'}
            <input
              type="file"
              disabled={importBusy}
              accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(event) => {
                void handleStudentFile(event.target.files?.[0])
                event.currentTarget.value = ''
              }}
              className="sr-only"
            />
          </label>
        </div>
        {importMessage ? (
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
            {importMessage}
          </p>
        ) : null}
        {importError ? (
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-100">
            {importError}
          </p>
        ) : null}
      </section>

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
        className="space-y-8 rounded-[1.6rem] border border-dashed border-pathwise-line bg-white/45 p-4 shadow-sm  md:p-6"
      >
        <ParentDashboard student={activeStudent ?? null} />
        {activeStudent && <StudentNotesPanel studentId={activeStudent.id} />}
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'))
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Файл пустой или повреждён.'))
    }
    reader.readAsDataURL(file)
  })
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'profile'
}
