"use client";

import { PortfolioUploadClient } from "@/components/portfolio/PortfolioUploadClient";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function PortfolioView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero kicker="Портфолио" title={t("portfolio.title")} description={t("portfolio.sub")}>
        <div className="mt-6 rounded-2xl border border-pathwise-line/80 bg-white/70 p-4 text-sm leading-6 text-pathwise-muted shadow-sm">
          {t("portfolio.intro")}
        </div>
      </PageHero>
      <ContentCard>
        <PortfolioUploadClient />
      </ContentCard>
    </div>
  );
}
