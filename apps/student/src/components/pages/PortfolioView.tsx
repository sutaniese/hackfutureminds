"use client";

import { PortfolioUploadClient } from "@/components/portfolio/PortfolioUploadClient";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function PortfolioView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title={t("portfolio.title")}
        description={t("portfolio.sub")}
        className="from-amber-500 via-orange-500 to-rose-500 shadow-amber-500/15"
      />
      <p className="text-sm leading-relaxed text-pathwise-muted">{t("portfolio.intro")}</p>
      <ContentCard>
        <PortfolioUploadClient />
      </ContentCard>
    </div>
  );
}
