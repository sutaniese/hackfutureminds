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
      />
      <OnboardingChat />
    </div>
  );
}
