/** Local onboarding draft — all answers before /api/generate (step 3) */

export type WorkPreference = "people" | "data" | "hands" | "ideas";

export type StudyLocation = "kazakhstan" | "abroad";

export const TOTAL_ONBOARDING_STEPS = 7 as const;

export type OnboardingAnswers = {
  subjectIds: string[];
  freeTime: string;
  achievements: string;
  workPreference: WorkPreference | null;
  studyLocation: StudyLocation | null;
  city: string;
  budgetConstraints: string;
};

export function createEmptyAnswers(): OnboardingAnswers {
  return {
    subjectIds: [],
    freeTime: "",
    achievements: "",
    workPreference: null,
    studyLocation: null,
    city: "",
    budgetConstraints: "",
  };
}
