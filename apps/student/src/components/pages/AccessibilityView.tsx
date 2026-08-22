"use client";

import Link from "next/link";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
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
      <ContentCard>
        <ul className="grid gap-3 text-sm text-foreground md:grid-cols-3">
          {[t("acc.li1"), t("acc.li2"), t("acc.li3")].map((item) => (
            <li key={item} className="rounded-2xl border border-pathwise-line bg-pathwise-accent-soft/35 p-4">
              {item}
            </li>
          ))}
        </ul>
      </ContentCard>
      <ContentCard className="text-sm leading-6 text-foreground">{t("acc.later")}</ContentCard>
      <Link
        href="/"
        className="pw-secondary-btn pw-focus self-start px-5 text-sm"
      >
        {t("acc.back")}
      </Link>
    </div>
  );
}
