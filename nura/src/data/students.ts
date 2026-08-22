import type { StudentProfile } from '../types/pathwise'

const aigerim: StudentProfile = {
  id: 'aigerim-demo',
  displayName: 'Айгерим К.',
  age: 17,
  city: 'Алматы',
  interests: ['биология', 'химия', 'медицина'],
  achievements: ['2 место — республиканская олимпиада по биологии'],
  target_university: 'Назарбаев Университет / медицина, Астана',
  language: 'ru',
  primaryCareerTitle: 'Врач-исследователь',
  career_map: [
    {
      title: 'Биомедицинский инженер',
      salary: '450 000 – 700 000 ₸',
      path: 'Бакалавриат STEM → R&D в фарме/диагностике',
      vacancies: ['Инженер-лаборант', 'Специалист по качеству', 'Clinical Affairs (junior)'],
    },
    {
      title: 'Врач-исследователь',
      salary: '600 000 – 1 200 000 ₸ (после ординатуры выше)',
      path: 'Мед. университет → ординатура → клинические исследования',
      vacancies: ['Ассистент врача', 'Координатор КИ', 'Мед. представитель (science)'],
    },
    {
      title: 'Биотехнолог',
      salary: '400 000 – 850 000 ₸',
      path: 'Биотех / биоинформатика → производство и R&D',
      vacancies: ['Лаборант молекулярной биологии', 'QA в биопроизводстве'],
    },
  ],
  financial_route: {
    monthly_cost: 180000,
    grants: [
      {
        name: 'Болашак (стипендия за рубежом)',
        amount: 120000,
        amountLabel: '~$800/мес',
        deadline: 'ноябрь',
        currency: 'USD',
        amountMonthlyKzt: 360000,
      },
      {
        name: 'DAAD (Германия)',
        amount: 300,
        amountLabel: '$300–800/мес',
        deadline: 'октябрь',
        currency: 'USD',
        amountMonthlyKzt: 135000,
      },
      {
        name: 'НАО грант (КЗ)',
        amount: 4,
        amountLabel: 'до 4 МРП/мес',
        deadline: 'июль',
        currency: 'KZT',
        amountMonthlyKzt: 60000,
      },
      {
        name: 'Erasmus+',
        amount: 1000,
        amountLabel: 'до €1 000/мес',
        deadline: 'февраль',
        currency: 'EUR',
        amountMonthlyKzt: 500000,
      },
    ],
    gap: 60000,
    coverage_percent: 67,
  },
  portfolio_block:
    'Призёр республиканской олимпиады по биологии (топ 3%, 340 участников). Готовый блок для мотивационного письма и резюме.',
}

const daniyar: StudentProfile = {
  id: 'daniyar-demo',
  displayName: 'Данияр Н.',
  age: 16,
  city: 'Шымкент',
  interests: ['математика', 'робототехника'],
  achievements: ['KazRoboProject — финалист'],
  target_university: 'КТИ имени Сатпаева',
  language: 'kk',
  primaryCareerTitle: 'Инженер-программист (embedded)',
  career_map: [
    {
      title: 'Инженер встроенных систем',
      salary: '500 000 – 900 000 ₸',
      path: 'STEM → промышленная автоматизация / IoT',
      vacancies: ['Embedded developer junior', 'Firmware engineer'],
    },
    {
      title: 'Data / MLOps (junior)',
      salary: '450 000 – 800 000 ₸',
      path: 'CS → продуктовые команды',
      vacancies: ['Junior data engineer', 'ML intern'],
    },
    {
      title: 'DevOps',
      salary: '550 000 – 1 000 000 ₸',
      path: 'Инфраструктура и облака',
      vacancies: ['Junior DevOps', 'SRE trainee'],
    },
  ],
  financial_route: {
    monthly_cost: 120000,
    grants: [
      {
        name: 'KAZNEX INVEST (tech)',
        amount: 0,
        amountLabel: 'переменная поддержка',
        deadline: 'апрель',
        currency: 'KZT',
        amountMonthlyKzt: 80000,
      },
      {
        name: 'НАО грант (КЗ)',
        amount: 4,
        amountLabel: 'до 4 МРП/мес',
        deadline: 'июль',
        currency: 'KZT',
        amountMonthlyKzt: 60000,
      },
    ],
    gap: 40000,
    coverage_percent: 58,
  },
  portfolio_block:
    'Финалист инженерного конкурса KazRoboProject: командная разработка автономного модуля, документация и защита перед жюри.',
}

const byId: Record<string, StudentProfile> = {
  [aigerim.id]: aigerim,
  [daniyar.id]: daniyar,
}

export function getStudentById(id: string): StudentProfile | undefined {
  return byId[id]
}

export const DEMO_STUDENT_IDS = Object.keys(byId)
