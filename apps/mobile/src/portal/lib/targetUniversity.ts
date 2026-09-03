import { memoryGet, memorySet } from "../../lib/storage";

export const TARGET_UNIVERSITY_STORAGE_KEY = "pathwise-target-university";

export type TargetUniversity = {
  id: string;
  name: string;
  city?: string;
};

export function readTargetUniversity(): TargetUniversity | null {
  try {
    const raw = memoryGet(TARGET_UNIVERSITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TargetUniversity>;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string") return null;
    return { id: parsed.id, name: parsed.name, city: parsed.city };
  } catch {
    return null;
  }
}

export function saveTargetUniversity(university: TargetUniversity): void {
  memorySet(TARGET_UNIVERSITY_STORAGE_KEY, JSON.stringify(university));
}
