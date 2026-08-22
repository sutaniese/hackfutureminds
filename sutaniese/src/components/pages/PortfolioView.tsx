"use client";

import { PortfolioUploadClient } from "@/components/portfolio/PortfolioUploadClient";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function PortfolioView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero title={t("portfolio.title")} description={t("portfolio.sub")} />
      <p className="text-sm text-pathwise-muted">{t("portfolio.intro")}</p>
      <ContentCard>
        <PortfolioUploadClient />
      </ContentCard>
    </div>
  );
}
