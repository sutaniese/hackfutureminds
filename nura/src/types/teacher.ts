import type { StudentProfile } from './pathwise'

/** Ученик в контексте класса (учительский дашборд) */
export type ClassStudentRow = {
  id: string
  onboardingComplete: boolean
  /** Основные направления из ten */
  careerDirections: string[]
  /** Нужна ли усиленная финансовая поддержка / гранты */
  needsFinancialHelp: boolean
  profile: StudentProfile
}

export type TeacherClass = {
  id: string
  name: string
  inviteCode: string
  students: ClassStudentRow[]
}
