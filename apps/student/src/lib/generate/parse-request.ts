import type { GenerateLanguage, GenerateRequest } from "@/types/generate";
import type { OnboardingAnswers } from "@/types/onboarding";

function strArr(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isOnboarding(v: unknown): v is OnboardingAnswers {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (
    !Array.isArray(o.subjectIds) ||
    !o.subjectIds.every((x) => typeof x === "string")
  ) {
    return false;
  }
  if (typeof o.freeTime !== "string" || typeof o.achievements !== "string")
    return false;
  if (typeof o.city !== "string" || typeof o.budgetConstraints !== "string")
    return false;
  const w = o.workPreference;
  if (
    w !== null &&
    w !== "people" &&
    w !== "data" &&
    w !== "hands" &&
    w !== "ideas"
  ) {
    return false;
  }
  const s = o.studyLocation;
  if (s !== null && s !== "kazakhstan" && s !== "abroad") return false;
  return true;
}

export function parseGenerateRequest(body: unknown): GenerateRequest {
  if (body == null || typeof body !== "object") {
    throw new Error("Body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  const interests = strArr(b.interests);
  const achievements = strArr(b.achievements);

  const target =
    typeof b.target_university === "string" ? b.target_university : "";
  const city = typeof b.city === "string" ? b.city : "";
  const bud =
    typeof b.budget_monthly === "number" && !Number.isNaN(b.budget_monthly)
      ? b.budget_monthly
      : 0;
  const lang = (b.language === "en" || b.language === "kk" || b.language === "ru"
    ? b.language
    : "en") as GenerateLanguage;

  const rawGoal = b.learningGoal;
  const learningGoal =
    rawGoal === "ent" ||
    rawGoal === "olympiad" ||
    rawGoal === "review" ||
    rawGoal === "school" ||
    rawGoal === "abroad"
      ? rawGoal
      : rawGoal === null
        ? null
        : undefined;

  let onboarding: OnboardingAnswers | null = null;
  if ("onboarding" in b) {
    if (b.onboarding === null) {
      onboarding = null;
    } else if (isOnboarding(b.onboarding)) {
      onboarding = b.onboarding;
    } else {
      throw new Error("Field onboarding has invalid shape");
    }
  }

  return {
    interests: interests ?? [],
    achievements: achievements ?? [],
    target_university: target,
    city,
    budget_monthly: bud,
    language: lang,
    learningGoal: learningGoal ?? null,
    onboarding,
  };
}
