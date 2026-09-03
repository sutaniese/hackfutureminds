"use client";

import { ClipPlayer } from "@/components/learning/ClipPlayer";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function ClipsView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <PageHero compact kicker={t("clips.kicker")} title={t("clips.title")} description={t("clips.desc")} />
      <ClipPlayer />
    </div>
  );
}
