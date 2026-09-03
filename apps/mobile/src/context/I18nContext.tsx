import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_KEY, type Locale } from "../i18n/locales";
import { tFor } from "../i18n/messageTable";
import { colors, contrastColors, type ThemeColors } from "../lib/theme";
import { memoryGet, memorySet } from "../lib/storage";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  highContrast: boolean;
  toggleContrast: () => void;
  palette: ThemeColors;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = memoryGet(LOCALE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  });
  const [highContrast, setHighContrast] = useState(() => memoryGet("ten-contrast") === "1");

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    memorySet(LOCALE_KEY, next);
  }, []);

  const toggleContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev;
      memorySet("ten-contrast", next ? "1" : "0");
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => tFor(locale, key, params),
    [locale],
  );

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t,
      highContrast,
      toggleContrast,
      palette: highContrast ? contrastColors : colors,
    }),
    [locale, setLocale, t, highContrast, toggleContrast],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
