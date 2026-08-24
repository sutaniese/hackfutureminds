import { getCurrentUser } from "@/lib/auth";
import { isProfileComplete } from "@/lib/gamification";
import { readLearningState } from "@/lib/learning/store";
import { ROLE_ENTRY_PATHS } from "@/lib/site-nav";
import {
  readCurrentStudentProfile,
  syncCurrentStudentProfile,
} from "@/lib/student-profile-store";
import type { OnboardingAnswers } from "@/types/onboarding";

export const ONBOARDING_SESSION_KEY = "pathwise-onboarding-answers";

export function isOnboardingComplete(answers: OnboardingAnswers | null | undefined): boolean {
  return isProfileComplete(answers ?? null);
}

export function readSessionOnboarding(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as OnboardingAnswers;
  } catch {
    return null;
  }
}

export function writeSessionOnboarding(answers: OnboardingAnswers) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(answers));
  } catch {
    /* ignore */
  }
}

export function clearSessionOnboarding() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ONBOARDING_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Answers for the signed-in student, or this tab's guest session. Isolated per account. */
export function readCurrentOnboarding(): OnboardingAnswers | null {
  const profile = readCurrentStudentProfile();
  if (profile?.onboarding && isOnboardingComplete(profile.onboarding)) {
    return profile.onboarding;
  }
  const session = readSessionOnboarding();
  if (session && isOnboardingComplete(session) && !getCurrentUser()) {
    return session;
  }
  if (profile?.onboarding) return profile.onboarding;
  if (!getCurrentUser()) return session;
  return null;
}

export function persistOnboarding(answers: OnboardingAnswers) {
  writeSessionOnboarding(answers);
  syncCurrentStudentProfile({ onboarding: answers });
}

export function hasDiagnosticForCurrentUser(): boolean {
  return Boolean(readLearningState().diagnostic);
}

/**
 * Where a student should land after login: new users still get Start (onboarding).
 * Completed users skip retake prompts.
 */
export function studentContinuePath(): string {
  if (typeof window === "undefined") return ROLE_ENTRY_PATHS.student;
  if (!isOnboardingComplete(readCurrentOnboarding())) return "/onboarding";
  if (!hasDiagnosticForCurrentUser()) return "/learning/diagnostics";
  return "/learning";
}
