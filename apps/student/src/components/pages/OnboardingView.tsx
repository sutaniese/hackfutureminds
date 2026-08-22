"use client";

import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function OnboardingView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker={t("onboard.kicker")}
        title={t("onboard.pageTitle")}
        description={t("onboard.pageSubtitle")}
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["7", "коротких шагов"],
            ["15–18", "возраст ученика"],
            ["AI", "план после анкеты"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-pathwise-line/80 bg-white/70 p-4 shadow-sm">
              <p className="text-2xl font-black text-pathwise-ink">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-pathwise-muted">
                {label}
              </p>
            </div>
          ))}
        </div>
      </PageHero>
      <OnboardingChat />
    </div>
  );
}
