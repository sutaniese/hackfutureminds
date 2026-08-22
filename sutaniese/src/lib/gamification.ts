import type { OnboardingAnswers } from "@/types/onboarding";
import type { GenerateResponse } from "@/types/generate";

const LAST_GEN = "pathwise-last-generate";

export type LastGeneratePayloadV1 = {
  v: 1;
  answers: OnboardingAnswers;
  data: GenerateResponse;
};

function answersMatch(a: OnboardingAnswers, b: OnboardingAnswers): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Portfolio “fill” 0–100: onboarding content + boost after a successful /api/generate. */
export function computePortfolioFillPercent(
  onboarding: OnboardingAnswers | null,
  hasGenerated: boolean
): number {
  if (!onboarding) return 0;
  let s = 0;
  if (onboarding.subjectIds.length > 0) s += 10;
  if (onboarding.freeTime.trim().length > 0) s += 10;
  if (onboarding.achievements.trim().length > 0) s += 15;
  if (onboarding.workPreference) s += 10;
  if (onboarding.studyLocation) s += 10;
  if (onboarding.city.trim().length > 0) s += 10;
  if (onboarding.budgetConstraints.trim().length > 0) s += 5;
  s = Math.min(70, s);
  if (hasGenerated) s = Math.min(100, s + 30);
  return s;
}

export function isProfileComplete(
  onboarding: OnboardingAnswers | null
): boolean {
  if (!onboarding) return false;
  return (
    onboarding.subjectIds.length > 0 &&
    onboarding.achievements.trim().length > 0 &&
    onboarding.workPreference != null &&
    onboarding.studyLocation != null &&
    onboarding.city.trim().length > 0
  );
}

export function readLastGenerate(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(LAST_GEN);
}

export function writeLastGenerate(json: string) {
  try {
    sessionStorage.setItem(LAST_GEN, json);
  } catch {
    /* */
  }
}

export function clearLastGenerate() {
  try {
    sessionStorage.removeItem(LAST_GEN);
  } catch {
    /* */
  }
}

/** Restores a prior generation only when it matches the current session onboarding. */
export function readLastGeneratePayload(
  current: OnboardingAnswers | null
): GenerateResponse | null {
  if (!current) return null;
  const raw = readLastGenerate();
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as {
      v?: number;
      answers?: OnboardingAnswers;
      data?: GenerateResponse;
    };
    if (o.v !== 1 || !o.answers || !o.data) return null;
    if (!answersMatch(o.answers, current)) return null;
    return o.data;
  } catch {
    return null;
  }
}

export function writeLastGeneratePayload(
  answers: OnboardingAnswers,
  data: GenerateResponse
) {
  const payload: LastGeneratePayloadV1 = { v: 1, answers, data };
  writeLastGenerate(JSON.stringify(payload));
}
