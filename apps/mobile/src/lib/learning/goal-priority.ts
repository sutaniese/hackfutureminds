import type { LearningGoalId } from "./types";
import type { OnboardingAnswers } from "../../types/onboarding";

const GOAL_PRIORITY: LearningGoalId[] = ["olympiad", "ent", "abroad", "school", "review"];

/**
 * Diagnostics / learning profile wins over the career onboarding анкета.
 * Never invent ЕНТ when the student picked olympiad (or school/review).
 */
export function resolveActiveLearningGoal(
  profile: { goals?: LearningGoalId[] } | null | undefined,
  onboarding?: OnboardingAnswers | null,
): LearningGoalId | null {
  if (profile?.goals?.length) {
    for (const id of GOAL_PRIORITY) {
      if (profile.goals.includes(id)) return id;
    }
    return profile.goals[0] ?? null;
  }

  if (!onboarding) return null;
  const blob = `${onboarding.achievements} ${onboarding.freeTime}`.toLowerCase();
  if (/олимпиад|olympiad|олимпиада/.test(blob)) return "olympiad";
  if (onboarding.studyLocation === "abroad") return "abroad";
  return null;
}

export function isUniversityGrantGoal(goal: LearningGoalId | null): boolean {
  return goal === "ent" || goal === "abroad";
}

export function isOlympiadGoal(goal: LearningGoalId | null): boolean {
  return goal === "olympiad";
}

export function isSchoolCatchupGoal(goal: LearningGoalId | null): boolean {
  return goal === "school" || goal === "review" || goal === null;
}
