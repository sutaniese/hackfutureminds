"use client";

import Link from "next/link";
import { LearningDashboard } from "@/components/learning/LearningDashboard";
import { useLearning } from "@/components/learning/useLearning";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function LearningView() {
  const { t } = useI18n();
  const { state, ready } = useLearning();
  const diagnosticDone = Boolean(ready && state.diagnostic);
  return (
    <div className="flex flex-col gap-5">
      <PageHero compact kicker={t("learn.kicker")} title={t("learn.title")} description={t("learn.desc")}>
        <div className="mt-5 flex flex-wrap gap-3">
          {diagnosticDone ? (
            <Link href="/learning/diagnostics" className="pw-btn-secondary text-sm">
              {t("learn.diagResults")}
            </Link>
          ) : (
            <Link href="/learning/diagnostics" className="pw-btn-primary text-sm">
              {t("learn.takeDiag")}
            </Link>
          )}
          <Link href="/learning/class" className="pw-btn-secondary text-sm">
            {t("learn.classLink")}
          </Link>
          <Link href="/roadmap" className="pw-btn-secondary text-sm">
            {t("learn.toRoadmap")}
          </Link>
        </div>
      </PageHero>
      <LearningDashboard />
    </div>
  );
}
