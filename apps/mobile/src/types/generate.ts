/**
 * `POST /api/generate` contract (see `student_dev_EN.md`) and
 * result artifacts: career map, financial route, portfolio.
 */

import type { OnboardingAnswers } from "./onboarding";

export type GenerateLanguage = "en" | "kk" | "ru";

/** Normalized client payload for the generator (aligns with onboarding + extra fields) */
export type GenerateRequest = {
  interests: string[];
  achievements: string[];
  target_university: string;
  city: string;
  budget_monthly: number;
  language: GenerateLanguage;
  /** Diagnostic / learning-profile goal. Wins over onboarding for career copy. */
  learningGoal?: "ent" | "olympiad" | "review" | "school" | "abroad" | null;
  /** Optional: full step-3 context for richer matching in step 5 */
  onboarding?: OnboardingAnswers | null;
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

export type MatchedGrantSummary = {
  name: string;
  amount: number;
  deadline: string;
  match: "low" | "medium" | "high";
  /** Optional link to static database row */
  grantId?: string;
};

export type FinancialRoute = {
  monthly_cost: number;
  grants: MatchedGrantSummary[];
  gap: number;
  coverage_percent: number;
};

export type UniversityProgramRecommendation = {
  universityId: string;
  universityName: string;
  city: string;
  programTitle: string;
  language: string;
  durationYears: number;
  fitScore: number;
  website?: string;
  rank?: number;
  universityType?: "public" | "private";
  categories?: string[];
  description?: string;
  admissionDeadline?: string;
  languageRequirement?: string;
  scholarships?: string[];
  documents?: string[];
  matchSummary?: string;
  professionTrack?: string;
  reasons: string[];
  nextSteps: string[];
};

export type GenerateResponse = {
  career_map: CareerMapItem[];
  financial_route: FinancialRoute;
  portfolio_block: string;
};
