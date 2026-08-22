import { ONBOARDING_SUBJECT_OPTIONS } from "@/lib/onboarding-constants";
import type { GenerateRequest } from "@/types/generate";
import type { OnboardingAnswers } from "@/types/onboarding";

function budgetKztFromText(s: string): number {
  const m = s.match(/(\d[\d\s]*)/);
  if (!m) return 0;
  const n = parseInt(m[1]!.replace(/\s/g, ""), 10) || 0;
  if (n <= 0) return 0;
  if (n < 500) return n * 1000;
  return Math.min(500_000, n);
}

/** Map onboarding into a valid `POST /api/generate` body. */
export function buildGenerateRequest(
  o: OnboardingAnswers,
  opts: { targetUniversity?: string; language?: "en" | "kk" | "ru" }
): GenerateRequest {
  const interests = o.subjectIds
    .map(
      (id) => ONBOARDING_SUBJECT_OPTIONS.find((x) => x.id === id)?.label || id
    )
    .filter(Boolean);
  const bud = budgetKztFromText(o.budgetConstraints);
  return {
    interests: interests.length ? interests : ["General studies"],
    achievements: [o.achievements || "—"],
    target_university:
      opts.targetUniversity || `University options near ${o.city || "Kazakhstan"}`,
    city: o.city || "Almaty",
    budget_monthly: bud > 0 ? bud : 80_000,
    language: opts.language || "en",
    onboarding: o,
  };
}
