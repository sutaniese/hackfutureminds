"use client";

import { canAccessUniversityLayer } from "@pathwise/shared";
import { ResultsGenerateClient } from "@/components/results/ResultsGenerateClient";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveActiveLearningGoal } from "@/lib/learning/goal-priority";
import { useLearning } from "@/components/learning/useLearning";
import { readCurrentOnboarding } from "@/lib/student-progress";
import { useEffect, useState } from "react";

export function ResultsView() {
  const { t } = useI18n();
  const { profile } = useLearning();
  const [goal, setGoal] = useState<ReturnType<typeof resolveActiveLearningGoal>>(null);

  useEffect(() => {
    setGoal(resolveActiveLearningGoal(profile, readCurrentOnboarding()));
  }, [profile]);

  const allowUniversity = canAccessUniversityLayer(profile?.grade);
  const olympiad = goal === "olympiad";
  const school = goal === "school" || goal === "review" || !allowUniversity;
  const title = olympiad
    ? t("results.pageTitle.olympiad")
    : school
      ? t("results.pageTitle.school")
      : t("results.pageTitle");
  const sub = olympiad
    ? t(allowUniversity ? "results.sub.olympiad" : "results.sub.olympiad.middle")
    : school
      ? t(allowUniversity ? "results.sub.school" : "results.sub.school.middle")
      : t("results.sub");
  const tags = olympiad
    ? ["results.tag.olympiad", "results.tag.review"]
    : school
      ? ["results.tag.school", "results.tag.review"]
      : ["results.tag.career", "results.tag.money", "results.tag.grants", "results.tag.resume"];

  return (
    <div className="flex flex-col gap-5">
      <PageHero compact kicker={t("results.kicker")} title={title} description={sub}>
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((item) => (
            <span
              key={item}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-pathwise-ink ring-1 ring-pathwise-line/80"
            >
              {t(item)}
            </span>
          ))}
        </div>
      </PageHero>
      <ResultsGenerateClient />
    </div>
  );
}
