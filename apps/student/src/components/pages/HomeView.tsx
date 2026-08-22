"use client";

import Link from "next/link";
import { PORTAL_PATHS, portalHref } from "@pathwise/shared/links";
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
        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/onboarding"
            className="inline-flex min-h-12 min-w-[8rem] items-center justify-center rounded-full bg-pw-primary px-5 text-sm font-semibold text-pw-primary-foreground ring-1 ring-pathwise-line/40 transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary"
          >
            {t("home.cta")}
          </Link>
          <Link
            href={portalHref(
              PORTAL_PATHS.agent,
              process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || undefined,
            )}
            className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-pathwise-line bg-pathwise-surface px-5 text-sm font-semibold text-foreground no-underline ring-1 ring-pathwise-line/40 transition hover:border-pw-primary hover:bg-pathwise-accent-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary"
          >
            {t("home.portal")}
          </Link>
        </div>
      </PageHero>
      <ContentCard>
        <p className="text-sm text-foreground">{t("home.card")}</p>
      </ContentCard>
    </div>
  );
}
