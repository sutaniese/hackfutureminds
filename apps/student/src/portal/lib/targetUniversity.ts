export const TARGET_UNIVERSITY_STORAGE_KEY = "pathwise-target-university";

export type TargetUniversity = {
  id: string;
  name: string;
  city?: string;
};

export function saveTargetUniversity(university: TargetUniversity) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TARGET_UNIVERSITY_STORAGE_KEY,
      JSON.stringify(university),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
