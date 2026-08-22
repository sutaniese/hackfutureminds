/**
 * Mirrors `apps/student/src/types/generate.ts` but kept dependency-free so both apps
 * can import it without dragging Next.js or Vite specifics. When you change the
 * contract, update both files together.
 */

export type GenerateLanguage = "en" | "kk" | "ru";

export type GenerateRequest = {
  interests: string[];
  achievements: string[];
  target_university: string;
  city: string;
  budget_monthly: number;
  language: GenerateLanguage;
};

export type VacancyRef = {
  title: string;
  company: string;
  url: string;
};

export type CareerMapItem = {
  title: string;
  salary_kzt: string;
  description: string;
  vacancies: VacancyRef[];
};

export type GrantMatchLevel = "low" | "medium" | "high";

export type MatchedGrantSummary = {
  name: string;
  amount: number;
  deadline: string;
  match: GrantMatchLevel;
  grantId?: string;
};

export type FinancialRoute = {
  monthly_cost: number;
  grants: MatchedGrantSummary[];
  gap: number;
  coverage_percent: number;
};

export type GenerateResponse = {
  career_map: CareerMapItem[];
  financial_route: FinancialRoute;
  portfolio_block: string;
};
