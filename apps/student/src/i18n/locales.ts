export type Locale = "ru" | "kk" | "en";

export const LOCALE_KEY = "ten-locale" as const;

export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALES: readonly Locale[] = ["ru", "kk", "en"] as const;

export function isLocale(s: string | null | undefined): s is Locale {
  return s === "ru" || s === "kk" || s === "en";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    if (isLocale(v)) return v;
  } catch {
    /* */
  }
  return DEFAULT_LOCALE;
}

export function writeStoredLocale(l: Locale) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_KEY, l);
  } catch {
    /* */
  }
}
