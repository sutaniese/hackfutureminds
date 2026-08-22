"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/locales";

const pill = (on: boolean) =>
  on
    ? "bg-pw-primary text-pw-primary-foreground shadow-sm"
    : "text-foreground ring-1 ring-pathwise-line bg-pathwise-surface/80 hover:bg-pathwise-accent-soft/50";

/**
 * RU (default) · KK · EN
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const go = (l: Locale) => {
    setLocale(l);
  };

  return (
    <div
      className="flex min-h-9 shrink-0 items-center gap-0.5 rounded-full p-0.5 ring-1 ring-pathwise-line/60"
      role="group"
      aria-label={t("lang.aria")}
    >
      {(
        [
          ["ru", "lang.ru"],
          ["kk", "lang.kk"],
          ["en", "lang.en"],
        ] as const
      ).map(([code, labelKey]) => (
        <button
          key={code}
          type="button"
          onClick={() => go(code)}
          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${pill(locale === code)}`}
          aria-pressed={locale === code}
          title={t(labelKey)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
