/**
 * Shared helpers for learning goal visibility by grade.
 * Goals requiring university-layer access (abroad, olympiad) are only
 * shown for grades 10–12.
 */

/** Goals that require access to the university navigation layer. */
const UNIVERSITY_LAYER_GOALS = new Set(["abroad"]);

/**
 * Returns true when the grade unlocks the university navigation layer
 * (grade 10 and above).
 */
export function canAccessUniversityLayer(grade: number): boolean {
  return grade >= 10;
}

/**
 * Filter a goal list to only the goals that are appropriate for the grade.
 * Goals in UNIVERSITY_LAYER_GOALS are hidden for grades below 10.
 */
export function goalsForGrade<T extends { id: string }>(
  goals: readonly T[],
  grade: number,
): T[] {
  if (canAccessUniversityLayer(grade)) return [...goals];
  return goals.filter((g) => !UNIVERSITY_LAYER_GOALS.has(g.id));
}

/**
 * Remove any selected goal IDs that are not valid for the new grade.
 * Falls back to ["ent"] if all selected goals become invalid.
 */
export function sanitizeGoalsForGrade(
  selected: string[],
  grade: number,
): string[] {
  const valid = selected.filter(
    (id) => !UNIVERSITY_LAYER_GOALS.has(id) || canAccessUniversityLayer(grade),
  );
  return valid.length > 0 ? valid : ["ent"];
}
