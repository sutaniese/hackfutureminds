import type { ServerClass, ServerStudent } from './api'
import type { ClassStudentRow, TeacherClass as LegacyTeacherClass } from '../types/teacher'
import type { StudentProfile } from '../types/pathwise'

function rowFromServerStudent(s: ServerStudent): ClassStudentRow {
  const careerDirections = [
    s.primaryCareerTitle,
    ...s.career_map.map((c) => c.title).filter((t) => t !== s.primaryCareerTitle),
  ]
    .filter(Boolean)
    .slice(0, 3)
  const profile: StudentProfile = {
    id: s.id,
    displayName: s.displayName,
    age: s.age,
    city: s.city,
    interests: s.interests,
    achievements: s.achievements,
    target_university: s.target_university,
    language: s.language,
    primaryCareerTitle: s.primaryCareerTitle,
    career_map: s.career_map,
    financial_route: s.financial_route,
    portfolio_block: s.portfolio_block,
  }
  return {
    id: s.id,
    onboardingComplete: !!s.onboardingComplete,
    careerDirections,
    needsFinancialHelp:
      typeof s.needsFinancialHelp === 'boolean'
        ? s.needsFinancialHelp
        : s.financial_route.gap > 55000 || s.financial_route.coverage_percent < 56,
    profile,
  }
}

export function adaptClass(c: ServerClass, allStudents: ServerStudent[]): LegacyTeacherClass {
  const byId = new Map(allStudents.map((s) => [s.id, s]))
  return {
    id: c.id,
    name: c.name,
    inviteCode: c.inviteCode,
    students: c.studentIds.map((id) => byId.get(id)).filter(Boolean).map((s) => rowFromServerStudent(s as ServerStudent)),
  }
}
