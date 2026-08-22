"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LOCALE, type Locale, readStoredLocale, writeStoredLocale } from "./locales";
import { tFor } from "./messageTable";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLoc] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLoc(readStoredLocale());
    setReady(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLoc(l);
    writeStoredLocale(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => tFor(locale, key, params),
    [locale],
  );

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
  }, [locale, ready]);

  const v = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );
  return <I18nContext.Provider value={v}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) {
    throw new Error("useI18n: wrap app with I18nProvider");
  }
  return c;
}
