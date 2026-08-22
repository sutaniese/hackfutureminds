export type CareerMapItem = {
  title: string
  salary: string
  path: string
  vacancies?: string[]
}

export type GrantItem = {
  name: string
  amount: number
  amountLabel: string
  deadline: string
  currency: 'KZT' | 'USD' | 'EUR'
  /** Примерная сумма в тенге в месяц для калькулятора */
  amountMonthlyKzt: number
}

export type FinancialRoute = {
  monthly_cost: number
  grants: GrantItem[]
  gap: number
  coverage_percent: number
}

export type StudentProfile = {
  id: string
  displayName: string
  age: number
  city: string
  interests: string[]
  achievements: string[]
  target_university: string
  language: 'ru' | 'kk' | 'en'
  /** Основной выбор ребёнка из карьерной карты */
  primaryCareerTitle: string
  career_map: CareerMapItem[]
  financial_route: FinancialRoute
  portfolio_block: string
}
