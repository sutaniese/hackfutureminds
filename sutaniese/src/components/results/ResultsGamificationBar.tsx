"use client";

import type { OnboardingAnswers } from "@/types/onboarding";
import type { GenerateResponse } from "@/types/generate";
import { computePortfolioFillPercent, isProfileComplete } from "@/lib/gamification";

type Props = {
  onboarding: OnboardingAnswers | null;
  data: GenerateResponse | null;
};

export function ResultsGamificationBar({ onboarding, data }: Props) {
  const hasGen = data != null;
  const fill = computePortfolioFillPercent(onboarding, hasGen);
  const complete = isProfileComplete(onboarding);
  const n = data?.financial_route?.grants?.length ?? 0;

  return (
    <div className="space-y-3 rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] p-4">
      {complete && (
        <div
          className="flex items-center gap-2 rounded-full border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 pw-badge-appear"
          role="status"
          aria-label="Profile complete"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm text-white"
            aria-hidden
          >
            ✓
          </span>
          Profile complete
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--pw-muted)]">
          <span>Portfolio fill</span>
          <span aria-live="polite">{fill}%</span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-[var(--pw-border)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fill}
          aria-label={`Portfolio ${fill} percent full`}
        >
          <div
            className="h-full rounded-full bg-[var(--pw-primary)] transition-[width] duration-500 ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      {hasGen && n > 0 && (
        <p
          className="text-center text-sm font-bold text-[var(--pw-primary)] pw-badge-appear"
          role="status"
        >
          +{n} grant{n === 1 ? "" : "s"} matched for you
        </p>
      )}

      {!onboarding && (
        <p className="text-xs text-[var(--pw-muted)]">
          Finish onboarding to build your profile score and fill level.
        </p>
      )}
    </div>
  );
}
