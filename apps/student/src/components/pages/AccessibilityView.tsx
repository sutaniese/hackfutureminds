"use client";

import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function AccessibilityView() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <PageHero
        kicker="teñ"
        title={t("acc.title")}
        description={t("acc.desc")}
      />
      <ul className="list-inside list-disc space-y-2 text-sm text-foreground">
        <li>{t("acc.li1")}</li>
        <li>{t("acc.li2")}</li>
        <li>{t("acc.li3")}</li>
      </ul>
      <div className="pw-card p-4 text-sm text-foreground">{t("acc.later")}</div>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center self-start text-sm font-semibold text-pw-primary no-underline underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {t("acc.back")}
      </Link>
    </div>
  );
}
