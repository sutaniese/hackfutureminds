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
      className="shrink-0 space-y-2"
      role="group"
      aria-label={t("onboard.srOnlyStep")}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-indigo-500">{label}</p>
        <p className="text-xs font-semibold text-slate-400">{Math.round(pct)}%</p>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={a}
        aria-label={label}
        aria-valuetext={label}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-sm shadow-indigo-500/30 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
