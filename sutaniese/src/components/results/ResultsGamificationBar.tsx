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
    <div className="space-y-3 rounded-2xl border-2 border-pathwise-line bg-pathwise-surface p-4">
      {complete && (
        <div
          className="pw-badge-appear flex items-center gap-2 rounded-full border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
          role="status"
          aria-label={t("gam.profileOk")}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm text-white"
            aria-hidden
          >
            ✓
          </span>
          {t("gam.profileOk")}
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-pathwise-muted">
          <span>{t("gam.fill")}</span>
          <span aria-live="polite">{fill}%</span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-pathwise-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fill}
          aria-label={`${t("gam.fill")} ${fill}%`}
        >
          <div
            className="h-full rounded-full bg-pw-primary transition-[width] duration-500 ease-out"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      {hasGen && n > 0 && (
        <p
          className="text-center text-sm font-bold text-pw-primary pw-badge-appear"
          role="status"
        >
          {t("gam.grantsN", { n })}
        </p>
      )}

      {!onboarding && (
        <p className="text-xs text-pathwise-muted">{t("gam.onboard")}</p>
      )}
    </div>
  );
}
