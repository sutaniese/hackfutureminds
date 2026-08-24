import {
  getCurrentUser,
  type PublicUser,
  type StudentAccessibilitySupport,
} from "@/lib/auth";
import type { GenerateResponse } from "@/types/generate";
import type { OnboardingAnswers } from "@/types/onboarding";

export const STUDENT_PROFILE_STORAGE_KEY = "pathwise-student-profiles";

export type StudentProfileSnapshot = {
  email: string;
  name?: string;
  updatedAt: number;
  onboarding?: OnboardingAnswers;
  generated?: GenerateResponse;
  accessibilitySupport?: StudentAccessibilitySupport;
};

function hasWindow() {
  return typeof window !== "undefined";
}

export function readStudentProfiles(): Record<string, StudentProfileSnapshot> {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const output: Record<string, StudentProfileSnapshot> = {};
    for (const [email, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const snapshot = value as Partial<StudentProfileSnapshot>;
      if (typeof snapshot.email === "string" && typeof snapshot.updatedAt === "number") {
        output[email] = snapshot as StudentProfileSnapshot;
      }
    }
    return output;
  } catch {
    return {};
  }
}

function writeStudentProfiles(profiles: Record<string, StudentProfileSnapshot>) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STUDENT_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

export function upsertStudentProfileSnapshot(
  user: Pick<PublicUser, "email" | "name" | "accessibilitySupport">,
  patch: Partial<Omit<StudentProfileSnapshot, "email" | "name" | "updatedAt">> = {},
) {
  const email = user.email.trim().toLowerCase();
  if (!email) return;
  const profiles = readStudentProfiles();
  const previous = profiles[email];
  profiles[email] = {
    ...previous,
    ...patch,
    email,
    name: user.name || previous?.name,
    accessibilitySupport:
      patch.accessibilitySupport ?? user.accessibilitySupport ?? previous?.accessibilitySupport,
    updatedAt: Date.now(),
  };
  writeStudentProfiles(profiles);
}

export function syncCurrentStudentProfile(
  patch: Partial<Omit<StudentProfileSnapshot, "email" | "name" | "updatedAt">> = {},
) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") return;
  upsertStudentProfileSnapshot(user, patch);
}

export function readCurrentStudentProfile(): StudentProfileSnapshot | null {
  const user = getCurrentUser();
  if (!user || user.role !== "student") return null;
  return readStudentProfiles()[user.email.trim().toLowerCase()] ?? null;
}
