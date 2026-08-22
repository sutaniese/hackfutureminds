import type { ClassStudentRow, TeacherClass } from '../types/teacher'
import type { StudentProfile } from '../types/pathwise'
import { getStudentById } from './students'

function rowFromProfile(
  profile: StudentProfile,
  onboardingComplete: boolean,
  needsFinancialHelp?: boolean,
): ClassStudentRow {
  const directions = [
    profile.primaryCareerTitle,
    ...profile.career_map.map((c) => c.title).filter((t) => t !== profile.primaryCareerTitle),
  ].slice(0, 3)
  const fin =
    needsFinancialHelp ??
    (profile.financial_route.gap > 55000 || profile.financial_route.coverage_percent < 56)
  return {
    id: profile.id,
    onboardingComplete,
    careerDirections: directions,
    needsFinancialHelp: fin,
    profile,
  }
}

const erlan: StudentProfile = {
  id: 'erlan-demo',
  displayName: 'Ерлан Т.',
  age: 16,
  city: 'Караганда',
  interests: ['физика', 'робототехника'],
  achievements: ['Призёр областной олимпиады по физике'],
  target_university: 'Satbayev University',
  language: 'kk',
  primaryCareerTitle: 'Инженер-робототехник',
  career_map: [
    {
      title: 'Инженер-робототехник',
      salary: '480 000 – 900 000 ₸',
      path: 'Мехатроника → промышленные роботы',
    },
    {
      title: 'Промышленный дизайнер (CAD)',
      salary: '400 000 – 750 000 ₸',
      path: 'Инженерная графика → производство',
    },
  ],
  financial_route: {
    monthly_cost: 140000,
    grants: [],
    gap: 90000,
    coverage_percent: 35,
  },
  portfolio_block: 'Призёр областной олимпиады по физике; участник школьной лаборатории робототехники.',
}

const alua: StudentProfile = {
  id: 'alua-demo',
  displayName: 'Алуа С.',
  age: 15,
  city: 'Астана',
  interests: ['литература', 'волонтёрство'],
  achievements: ['Волонтёр городского фестиваля (120+ часов)'],
  target_university: 'ЕНУ им. Л.Н. Гумилёва',
  language: 'ru',
  primaryCareerTitle: 'PR / коммуникации',
  career_map: [
    {
      title: 'PR / коммуникации',
      salary: '350 000 – 650 000 ₸',
      path: 'Гуманитарный бакалавриат → агентства / НКО',
    },
    {
      title: 'Социальный предприниматель',
      salary: 'варьируется',
      path: 'НКО + гранты',
    },
  ],
  financial_route: {
    monthly_cost: 95000,
    grants: [],
    gap: 20000,
    coverage_percent: 78,
  },
  portfolio_block: '120+ часов волонтёрства; координация команды на городском фестивале.',
}

const madi: StudentProfile = {
  id: 'madi-demo',
  displayName: 'Мади Б.',
  age: 17,
  city: 'Алматы',
  interests: ['математика', 'программирование'],
  achievements: [],
  target_university: 'ещё в процессе выбора',
  language: 'ru',
  primaryCareerTitle: '—',
  career_map: [],
  financial_route: {
    monthly_cost: 100000,
    grants: [],
    gap: 100000,
    coverage_percent: 0,
  },
  portfolio_block: '',
}

export function buildSeedClasses(): TeacherClass[] {
  const a = getStudentById('aigerim-demo')
  const d = getStudentById('daniyar-demo')
  const base: ClassStudentRow[] = []
  if (a) base.push(rowFromProfile(a, true, false))
  if (d) base.push(rowFromProfile(d, true, false))
  base.push(rowFromProfile(erlan, true, true))
  base.push(rowFromProfile(alua, true, false))
  base.push(rowFromProfile(madi, false, true))

  return [
    {
      id: 'class-seed-1',
      name: '10«А» — профориентация (демо)',
      inviteCode: 'PW-H4K9L2',
      students: base,
    },
  ]
}
