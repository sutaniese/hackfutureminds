"use client";

import { ResultsGenerateClient } from "@/components/results/ResultsGenerateClient";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function ResultsView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero compact kicker="Карьера" title="Карьерный план" description={t("results.sub")}>
        <div className="mt-5 flex flex-wrap gap-2">
          {["карьера", "финансы", "гранты", "резюме"].map((item) => (
            <span
              key={item}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-pathwise-ink ring-1 ring-pathwise-line/80"
            >
              {item}
            </span>
          ))}
        </div>
      </PageHero>
      <ResultsGenerateClient />
    </div>
  );
}
