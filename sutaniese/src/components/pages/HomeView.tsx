"use client";

import Link from "next/link";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function HomeView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker={t("home.kicker")}
        title={t("home.title")}
        description={t("home.body")}
        aria-label="home"
      >
        <div className="mt-5">
          <Link
            href="/onboarding"
            className="inline-flex min-h-12 min-w-[8rem] items-center justify-center rounded-full bg-pw-primary px-5 text-sm font-semibold text-pw-primary-foreground ring-1 ring-pathwise-line/40 transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary"
          >
            {t("home.cta")}
          </Link>
        </div>
      </PageHero>
      <ContentCard>
        <p className="text-sm text-foreground">{t("home.card")}</p>
      </ContentCard>
    </div>
  );
}
