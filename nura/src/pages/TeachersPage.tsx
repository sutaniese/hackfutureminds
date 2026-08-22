import { TeacherDashboard } from '../components/TeacherDashboard'

export function TeachersPage() {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-pathwise-ink md:text-3xl">Учителя</h1>
        <p className="mt-2 max-w-3xl text-sm text-pathwise-muted">
          Класс и код приглашения, свод по ученикам, рекомендательное письмо (Gemini), CSV для директора.
        </p>
      </div>
      <TeacherDashboard />
    </>
  )
}
