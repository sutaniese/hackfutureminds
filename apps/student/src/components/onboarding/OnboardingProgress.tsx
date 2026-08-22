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
      className="pw-glass sticky top-20 z-10 shrink-0 space-y-2 rounded-full px-4 py-3"
      role="group"
      aria-label={t("onboard.srOnlyStep")}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-pathwise-accent-strong">{label}</p>
        <p className="text-xs font-semibold text-pathwise-muted">{Math.round(pct)}%</p>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={a}
        aria-label={label}
        aria-valuetext={label}
      >
        <div
          className="h-full rounded-full bg-[#6C63FF] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
