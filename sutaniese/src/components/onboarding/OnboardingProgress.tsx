"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { TOTAL_ONBOARDING_STEPS } from "@/types/onboarding";

type Props = {
  currentStep: number;
  total: typeof TOTAL_ONBOARDING_STEPS;
  id?: string;
};

export function OnboardingProgress({ currentStep, total, id }: Props) {
  const { t } = useI18n();
  const safe = Math.min(Math.max(0, currentStep), total - 1);
  const pct = ((safe + 1) / total) * 100;
  const a = safe + 1;
  const label = t("onboard.progLine", { a, b: total });

  return (
    <div
      id={id}
      className="shrink-0 space-y-1.5"
      role="group"
      aria-label={t("onboard.srOnlyStep")}
    >
      <p className="text-center text-xs font-semibold tracking-wide text-pathwise-muted">
        {label}
      </p>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-pathwise-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={a}
        aria-label={label}
        aria-valuetext={label}
      >
        <div
          className="h-full rounded-full bg-pw-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
