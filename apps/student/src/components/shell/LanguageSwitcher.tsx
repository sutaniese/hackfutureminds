"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/locales";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  const go = (l: Locale) => setLocale(l);

  const pillCls = (on: boolean) =>
    on
      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20"
      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50";

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-xl bg-slate-100/60 p-0.5"
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
          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold tracking-wide transition-all duration-200 ${pillCls(locale === code)}`}
          aria-pressed={locale === code}
          title={t(labelKey)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
