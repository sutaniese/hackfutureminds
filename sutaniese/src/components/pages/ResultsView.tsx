"use client";

import { ResultsGenerateClient } from "@/components/results/ResultsGenerateClient";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function ResultsView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero title={t("results.title")} description={t("results.sub")} />
      <ResultsGenerateClient />
    </div>
  );
}
