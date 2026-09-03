import { canAccessUniversityLayer, isUniversityLayerGoal } from "@pathwise/shared";
import type { LearningGoalId } from "./types";
import type { OnboardingAnswers } from "@/types/onboarding";

const GOAL_PRIORITY: LearningGoalId[] = ["olympiad", "ent", "abroad", "school", "review"];

/**
 * Diagnostics / learning profile wins over the career onboarding анкета.
 * Never invent ЕНТ when the student picked olympiad (or school/review).
 * Grades 7–9 never resolve to the university / grants layer.
 */
export function resolveActiveLearningGoal(
  profile: { goals?: LearningGoalId[]; grade?: number } | null | undefined,
  onboarding?: OnboardingAnswers | null,
): LearningGoalId | null {
  const allowUniversity = canAccessUniversityLayer(profile?.grade);

  if (profile?.goals?.length) {
    const goals = allowUniversity
      ? profile.goals
      : profile.goals.filter((id) => !isUniversityLayerGoal(id));
    for (const id of GOAL_PRIORITY) {
      if (goals.includes(id)) return id;
    }
    return goals[0] ?? (allowUniversity ? null : "school");
  }

  if (!onboarding) return null;
  const blob = `${onboarding.achievements} ${onboarding.freeTime}`.toLowerCase();
  if (/олимпиад|olympiad|олимпиада/.test(blob)) return "olympiad";
  if (allowUniversity && onboarding.studyLocation === "abroad") return "abroad";
  return allowUniversity ? null : "school";
}

export function isUniversityGrantGoal(goal: LearningGoalId | null): boolean {
  return isUniversityLayerGoal(goal);
}

export function isOlympiadGoal(goal: LearningGoalId | null): boolean {
  return goal === "olympiad";
}

export function isSchoolCatchupGoal(goal: LearningGoalId | null): boolean {
  return goal === "school" || goal === "review" || goal === null;
}
