/**
 * University / grants / admission layer is for grades 10–12 only.
 * Grades 7–9 stay on school mastery + olympiad prep + clips.
 * Unknown grade keeps today's 10–12 surface so we never hide the layer
 * until we know the student is 7–9. Switching to 10+ brings it back.
 */

export const UNIVERSITY_LAYER_MIN_GRADE = 10;

export const UNIVERSITY_LAYER_GOALS = ["ent", "abroad"] as const;

export type UniversityLayerGoal = (typeof UNIVERSITY_LAYER_GOALS)[number];

export type GradeLike = number | string | null | undefined;

/** 0-based onboarding indexes: study location (KZ/abroad) and family budget. */
export const UNIVERSITY_ONBOARDING_STEP_INDEXES = [4, 6] as const;

export function parseGradeNumber(grade: GradeLike): number | null {
  if (grade == null || grade === "") return null;
  const n = typeof grade === "number" ? grade : Number.parseInt(String(grade), 10);
  return Number.isFinite(n) ? n : null;
}

export function canAccessUniversityLayer(grade: GradeLike): boolean {
  const n = parseGradeNumber(grade);
  if (n == null) return true;
  return n >= UNIVERSITY_LAYER_MIN_GRADE;
}

export function isUniversityLayerGoal(goal: string | null | undefined): boolean {
  return goal === "ent" || goal === "abroad";
}

export function goalsForGrade<T extends { id: string }>(
  goals: readonly T[],
  grade: GradeLike,
): T[] {
  if (canAccessUniversityLayer(grade)) return [...goals];
  return goals.filter((item) => !isUniversityLayerGoal(item.id));
}

export function sanitizeGoalsForGrade<T extends string>(
  goals: readonly T[],
  grade: GradeLike,
  fallback: T = "school" as T,
): T[] {
  if (canAccessUniversityLayer(grade)) return [...goals];
  const next = goals.filter((item) => !isUniversityLayerGoal(item));
  return next.length > 0 ? next : [fallback];
}

export function isUniversityNavHref(href: string): boolean {
  return (
    href === "/grants" ||
    href.startsWith("/grants/") ||
    href === "/hub/vuzy" ||
    href.startsWith("/hub/vuzy/")
  );
}

export function filterNavLinksForGrade<T extends { href: string }>(
  links: readonly T[],
  grade: GradeLike,
): T[] {
  if (canAccessUniversityLayer(grade)) return [...links];
  return links.filter((link) => !isUniversityNavHref(link.href));
}

export function isUniversityOnboardingStep(stepIndex0: number): boolean {
  return stepIndex0 === 4 || stepIndex0 === 6;
}

export function nextOnboardingStepIndex(
  current0: number,
  grade: GradeLike,
  direction: 1 | -1,
): number {
  let next = current0 + direction;
  while (
    next >= 0 &&
    next <= 6 &&
    !canAccessUniversityLayer(grade) &&
    isUniversityOnboardingStep(next)
  ) {
    next += direction;
  }
  return next;
}
