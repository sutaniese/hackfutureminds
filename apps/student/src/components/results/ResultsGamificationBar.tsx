"use client";

import type { OnboardingAnswers } from "@/types/onboarding";
import type { GenerateResponse } from "@/types/generate";
import { computePortfolioFillPercent, isProfileComplete } from "@/lib/gamification";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  onboarding: OnboardingAnswers | null;
  data: GenerateResponse | null;
};

export function ResultsGamificationBar({ onboarding, data }: Props) {
  const { t } = useI18n();
  const hasGen = data != null;
  const fill = computePortfolioFillPercent(onboarding, hasGen);
  const complete = isProfileComplete(onboarding);
  const n = data?.financial_route?.grants?.length ?? 0;

  return (
    <div className="pw-card space-y-4 p-5">
      {complete && (
        <div
          className="pw-badge-appear flex items-center gap-3 rounded-2xl border border-[#d7d3ff] bg-[#f1efff] px-4 py-3 text-sm font-semibold text-[#554dd6]"
          role="status"
          aria-label={t("gam.profileOk")}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6C63FF] text-sm text-white shadow-sm" aria-hidden>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
          {t("gam.profileOk")}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className="text-pathwise-muted">{t("gam.fill")}</span>
          <span className="text-pathwise-accent-strong" aria-live="polite">{fill}%</span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fill}
          aria-label={`${t("gam.fill")} ${fill}%`}
        >
          <div
            className="h-full rounded-full bg-[#6C63FF] shadow-sm transition-[width] duration-700 ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      {hasGen && n > 0 && (
        <p className="pw-badge-appear text-center text-sm font-bold pw-gradient-text" role="status">
          {t("gam.grantsN", { n })}
        </p>
      )}

      {!onboarding && (
        <p className="text-xs text-pathwise-muted">{t("gam.onboard")}</p>
      )}
    </div>
  );
}
